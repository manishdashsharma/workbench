import { getPrisma } from '../../../config/databases.js';
import { CacheManager } from '../../../config/redis.js';
import { httpResponse, responseMessage, httpError, asyncHandler, logger } from '../../../shared/index.js';
import { EUserRoles } from '../../auth/constants/auth.contant.js';

const prisma = getPrisma();
const cache = new CacheManager();

const createProject = asyncHandler(async (req, res) => {
  if (req.user.role !== EUserRoles.MANAGER) {
    return httpError(req, res, new Error('Only managers can create projects'), 403);
  }

  const { name, description } = req.body;

  const project = await prisma.project.create({
    data: {
      name,
      description,
      companyId: req.user.companyId,
    }
  });

  await cache.deletePattern(`company:${req.user.companyId}:projects*`);

  logger.info('Project created', {
    projectId: project.id,
    managerId: req.user.id,
    companyId: req.user.companyId,
    requestId: req.requestId,
  });

  return httpResponse(req, res, 201, responseMessage.custom('Project created successfully'), project);
});

const getProjects = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  const where = { companyId: req.user.companyId };

  if (req.user.role === EUserRoles.EMPLOYEE) {
    const userProjects = await prisma.projectMember.findMany({
      where: { userId: req.user.id },
      select: { projectId: true }
    });
    where.id = { in: userProjects.map(p => p.projectId) };
  }

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit, 10),
      skip: (parseInt(page, 10) - 1) * parseInt(limit, 10),
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            members: true,
            tasks: true,
          }
        }
      }
    }),
    prisma.project.count({ where })
  ]);

  return httpResponse(req, res, 200, responseMessage.custom('Projects fetched successfully'), {
    projects,
    pagination: {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      total,
      totalPages: Math.ceil(total / parseInt(limit, 10))
    }
  });
});

const getProject = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const project = await prisma.project.findFirst({
    where: {
      id,
      companyId: req.user.companyId,
    },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            }
          }
        }
      },
      _count: {
        select: {
          tasks: true,
        }
      }
    }
  });

  if (!project) {
    return httpError(req, res, new Error('Project not found'), 404);
  }

  if (req.user.role === EUserRoles.EMPLOYEE) {
    const isMember = project.members.some(m => m.userId === req.user.id);
    if (!isMember) {
      return httpError(req, res, new Error('You are not a member of this project'), 403);
    }
  }

  return httpResponse(req, res, 200, responseMessage.custom('Project fetched successfully'), project);
});

const updateProject = asyncHandler(async (req, res) => {
  if (req.user.role !== EUserRoles.MANAGER) {
    return httpError(req, res, new Error('Only managers can update projects'), 403);
  }

  const { id } = req.params;
  const { name, description } = req.body;

  const existingProject = await prisma.project.findFirst({
    where: {
      id,
      companyId: req.user.companyId,
    }
  });

  if (!existingProject) {
    return httpError(req, res, new Error('Project not found'), 404);
  }

  const updatedProject = await prisma.project.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(description !== undefined && { description }),
    }
  });

  logger.info('Project updated', {
    projectId: updatedProject.id,
    managerId: req.user.id,
    requestId: req.requestId,
  });

  return httpResponse(req, res, 200, responseMessage.custom('Project updated successfully'), updatedProject);
});

const deleteProject = asyncHandler(async (req, res) => {
  if (req.user.role !== EUserRoles.MANAGER) {
    return httpError(req, res, new Error('Only managers can delete projects'), 403);
  }

  const { id } = req.params;

  const existingProject = await prisma.project.findFirst({
    where: {
      id,
      companyId: req.user.companyId,
    }
  });

  if (!existingProject) {
    return httpError(req, res, new Error('Project not found'), 404);
  }

  await prisma.project.delete({
    where: { id }
  });

  logger.info('Project deleted', {
    projectId: id,
    managerId: req.user.id,
    requestId: req.requestId,
  });

  return httpResponse(req, res, 200, responseMessage.custom('Project deleted successfully'));
});

const addMember = asyncHandler(async (req, res) => {
  if (req.user.role !== EUserRoles.MANAGER) {
    return httpError(req, res, new Error('Only managers can add members'), 403);
  }

  const { id } = req.params;
  const { userId } = req.body;

  const project = await prisma.project.findFirst({
    where: {
      id,
      companyId: req.user.companyId,
    }
  });

  if (!project) {
    return httpError(req, res, new Error('Project not found'), 404);
  }

  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      companyId: req.user.companyId,
    }
  });

  if (!user) {
    return httpError(req, res, new Error('User not found in your company'), 404);
  }

  const existingMember = await prisma.projectMember.findUnique({
    where: {
      userId_projectId: {
        userId,
        projectId: id,
      }
    }
  });

  if (existingMember) {
    return httpError(req, res, new Error('User is already a member of this project'), 400);
  }

  const member = await prisma.projectMember.create({
    data: {
      userId,
      projectId: id,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        }
      }
    }
  });

  logger.info('Member added to project', {
    projectId: id,
    userId,
    managerId: req.user.id,
    requestId: req.requestId,
  });

  return httpResponse(req, res, 201, responseMessage.custom('Member added successfully'), member);
});

const removeMember = asyncHandler(async (req, res) => {
  if (req.user.role !== EUserRoles.MANAGER) {
    return httpError(req, res, new Error('Only managers can remove members'), 403);
  }

  const { id, userId } = req.params;

  const project = await prisma.project.findFirst({
    where: {
      id,
      companyId: req.user.companyId,
    }
  });

  if (!project) {
    return httpError(req, res, new Error('Project not found'), 404);
  }

  const member = await prisma.projectMember.findUnique({
    where: {
      userId_projectId: {
        userId,
        projectId: id,
      }
    }
  });

  if (!member) {
    return httpError(req, res, new Error('User is not a member of this project'), 404);
  }

  await prisma.projectMember.delete({
    where: {
      userId_projectId: {
        userId,
        projectId: id,
      }
    }
  });

  logger.info('Member removed from project', {
    projectId: id,
    userId,
    managerId: req.user.id,
    requestId: req.requestId,
  });

  return httpResponse(req, res, 200, responseMessage.custom('Member removed successfully'));
});

export {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
  addMember,
  removeMember,
};
