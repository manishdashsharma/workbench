import { getPrisma } from '../../../config/databases.js';
import { CacheManager } from '../../../config/redis.js';
import { httpResponse, responseMessage, httpError, asyncHandler, logger } from '../../../shared/index.js';
import { EUserRoles } from '../../auth/constants/auth.contant.js';
import { carryForwardIncompleteTasks, getCarriedForwardTasks } from '../services/carry-forward.service.js';

const prisma = getPrisma();
const cache = new CacheManager();

const createTask = asyncHandler(async (req, res) => {
  if (req.user.role !== EUserRoles.MANAGER) {
    return httpError(req, res, new Error('Only managers can create tasks'), 403);
  }

  const { title, description, type, projectId, assignedToId, startTime, endTime } = req.body;

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      companyId: req.user.companyId,
    }
  });

  if (!project) {
    return httpError(req, res, new Error('Project not found'), 404);
  }

  if (assignedToId) {
    const assignee = await prisma.user.findFirst({
      where: {
        id: assignedToId,
        companyId: req.user.companyId,
      }
    });

    if (!assignee) {
      return httpError(req, res, new Error('Assignee not found in your company'), 404);
    }

    const isMember = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId: assignedToId,
          projectId,
        }
      }
    });

    if (!isMember) {
      return httpError(req, res, new Error('Assignee is not a member of this project'), 400);
    }
  }

  const task = await prisma.task.create({
    data: {
      title,
      description,
      type,
      projectId,
      createdById: req.user.id,
      assignedToId,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
        }
      },
      assignedTo: {
        select: {
          id: true,
          name: true,
          email: true,
        }
      }
    }
  });

  logger.info('Task created', {
    taskId: task.id,
    projectId,
    managerId: req.user.id,
    assignedToId,
    requestId: req.requestId,
  });

  return httpResponse(req, res, 201, responseMessage.custom('Task created successfully'), task);
});

const getTasks = asyncHandler(async (req, res) => {
  const { projectId, status, page = 1, limit = 20 } = req.query;

  const where = {};

  if (projectId) {
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        companyId: req.user.companyId,
      }
    });

    if (!project) {
      return httpError(req, res, new Error('Project not found'), 404);
    }

    if (req.user.role === EUserRoles.EMPLOYEE) {
      const isMember = await prisma.projectMember.findUnique({
        where: {
          userId_projectId: {
            userId: req.user.id,
            projectId,
          }
        }
      });

      if (!isMember) {
        return httpError(req, res, new Error('You are not a member of this project'), 403);
      }
    }

    where.projectId = projectId;
  } else {
    if (req.user.role === EUserRoles.EMPLOYEE) {
      where.assignedToId = req.user.id;
    } else {
      where.project = { companyId: req.user.companyId };
    }
  }

  if (status) {
    where.status = status;
  }

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit, 10),
      skip: (parseInt(page, 10) - 1) * parseInt(limit, 10),
      include: {
        project: {
          select: {
            id: true,
            name: true,
          }
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    }),
    prisma.task.count({ where })
  ]);

  return httpResponse(req, res, 200, responseMessage.custom('Tasks fetched successfully'), {
    tasks,
    pagination: {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      total,
      totalPages: Math.ceil(total / parseInt(limit, 10))
    }
  });
});

const getTask = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const task = await prisma.task.findFirst({
    where: {
      id,
      project: {
        companyId: req.user.companyId,
      }
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
        }
      },
      assignedTo: {
        select: {
          id: true,
          name: true,
          email: true,
        }
      },
      createdBy: {
        select: {
          id: true,
          name: true,
        }
      },
      reviewedBy: {
        select: {
          id: true,
          name: true,
        }
      }
    }
  });

  if (!task) {
    return httpError(req, res, new Error('Task not found'), 404);
  }

  if (req.user.role === EUserRoles.EMPLOYEE && task.assignedToId !== req.user.id) {
    return httpError(req, res, new Error('You are not authorized to view this task'), 403);
  }

  return httpResponse(req, res, 200, responseMessage.custom('Task fetched successfully'), task);
});

const updateTask = asyncHandler(async (req, res) => {
  if (req.user.role !== EUserRoles.MANAGER) {
    return httpError(req, res, new Error('Only managers can update tasks'), 403);
  }

  const { id } = req.params;
  const { title, description, type, assignedToId, startTime, endTime } = req.body;

  const task = await prisma.task.findFirst({
    where: {
      id,
      project: {
        companyId: req.user.companyId,
      }
    }
  });

  if (!task) {
    return httpError(req, res, new Error('Task not found'), 404);
  }

  if (assignedToId) {
    const assignee = await prisma.user.findFirst({
      where: {
        id: assignedToId,
        companyId: req.user.companyId,
      }
    });

    if (!assignee) {
      return httpError(req, res, new Error('Assignee not found in your company'), 404);
    }

    const isMember = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId: assignedToId,
          projectId: task.projectId,
        }
      }
    });

    if (!isMember) {
      return httpError(req, res, new Error('Assignee is not a member of this project'), 400);
    }
  }

  const updatedTask = await prisma.task.update({
    where: { id },
    data: {
      ...(title && { title }),
      ...(description !== undefined && { description }),
      ...(type && { type }),
      ...(assignedToId && { assignedToId }),
      ...(startTime && { startTime: new Date(startTime) }),
      ...(endTime && { endTime: new Date(endTime) }),
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
        }
      },
      assignedTo: {
        select: {
          id: true,
          name: true,
          email: true,
        }
      }
    }
  });

  logger.info('Task updated', {
    taskId: updatedTask.id,
    managerId: req.user.id,
    requestId: req.requestId,
  });

  return httpResponse(req, res, 200, responseMessage.custom('Task updated successfully'), updatedTask);
});

const deleteTask = asyncHandler(async (req, res) => {
  if (req.user.role !== EUserRoles.MANAGER) {
    return httpError(req, res, new Error('Only managers can delete tasks'), 403);
  }

  const { id } = req.params;

  const task = await prisma.task.findFirst({
    where: {
      id,
      project: {
        companyId: req.user.companyId,
      }
    }
  });

  if (!task) {
    return httpError(req, res, new Error('Task not found'), 404);
  }

  await prisma.task.delete({
    where: { id }
  });

  logger.info('Task deleted', {
    taskId: id,
    managerId: req.user.id,
    requestId: req.requestId,
  });

  return httpResponse(req, res, 200, responseMessage.custom('Task deleted successfully'));
});

const startTask = asyncHandler(async (req, res) => {
  if (req.user.role !== EUserRoles.EMPLOYEE) {
    return httpError(req, res, new Error('Only employees can start tasks'), 403);
  }

  const { id } = req.params;

  const task = await prisma.task.findFirst({
    where: {
      id,
      assignedToId: req.user.id,
    }
  });

  if (!task) {
    return httpError(req, res, new Error('Task not found or not assigned to you'), 404);
  }

  if (task.actualStartTime) {
    return httpError(req, res, new Error('Task already started'), 400);
  }

  const updatedTask = await prisma.task.update({
    where: { id },
    data: {
      status: 'IN_PROGRESS',
      actualStartTime: new Date(),
    }
  });

  logger.info('Task started', {
    taskId: updatedTask.id,
    employeeId: req.user.id,
    requestId: req.requestId,
  });

  return httpResponse(req, res, 200, responseMessage.custom('Task started successfully'), updatedTask);
});

const completeTask = asyncHandler(async (req, res) => {
  if (req.user.role !== EUserRoles.EMPLOYEE) {
    return httpError(req, res, new Error('Only employees can complete tasks'), 403);
  }

  const { id } = req.params;

  const task = await prisma.task.findFirst({
    where: {
      id,
      assignedToId: req.user.id,
    }
  });

  if (!task) {
    return httpError(req, res, new Error('Task not found or not assigned to you'), 404);
  }

  if (task.status !== 'PENDING' && task.status !== 'IN_PROGRESS') {
    return httpError(req, res, new Error('Task must be in PENDING or IN_PROGRESS status to complete'), 400);
  }

  const now = new Date();

  const updatedTask = await prisma.task.update({
    where: { id },
    data: {
      status: 'COMPLETED',
      actualCompletedTime: now,
      completedAt: now,
      ...(!task.actualStartTime && { actualStartTime: task.startTime }),
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
        }
      }
    }
  });

  logger.info('Task completed', {
    taskId: updatedTask.id,
    employeeId: req.user.id,
    allocatedTime: (task.endTime - task.startTime) / 1000 / 60,
    actualTime: updatedTask.actualStartTime ? (now - updatedTask.actualStartTime) / 1000 / 60 : 0,
    requestId: req.requestId,
  });

  return httpResponse(req, res, 200, responseMessage.custom('Task completed successfully'), updatedTask);
});

const reviewTask = asyncHandler(async (req, res) => {
  if (req.user.role !== EUserRoles.MANAGER) {
    return httpError(req, res, new Error('Only managers can review tasks'), 403);
  }

  const { id } = req.params;

  const task = await prisma.task.findFirst({
    where: {
      id,
      project: {
        companyId: req.user.companyId,
      }
    }
  });

  if (!task) {
    return httpError(req, res, new Error('Task not found'), 404);
  }

  if (task.status !== 'COMPLETED') {
    return httpError(req, res, new Error('Task is not completed yet'), 400);
  }

  const updatedTask = await prisma.task.update({
    where: { id },
    data: {
      status: 'REVIEWED',
      reviewedById: req.user.id,
      reviewedAt: new Date(),
    },
    include: {
      assignedTo: {
        select: {
          id: true,
          name: true,
          email: true,
        }
      }
    }
  });

  logger.info('Task reviewed', {
    taskId: updatedTask.id,
    managerId: req.user.id,
    requestId: req.requestId,
  });

  return httpResponse(req, res, 200, responseMessage.custom('Task reviewed successfully'), updatedTask);
});

const runCarryForward = asyncHandler(async (req, res) => {
  if (req.user.role !== EUserRoles.MANAGER) {
    return httpError(req, res, new Error('Only managers can carry forward tasks'), 403);
  }

  const result = await carryForwardIncompleteTasks();

  await cache.invalidatePattern(`company:${req.user.companyId}:tasks*`, {
    requestId: req.requestId,
  });

  logger.info('Manual carry forward executed', {
    managerId: req.user.id,
    companyId: req.user.companyId,
    carriedForward: result.carriedForward,
    requestId: req.requestId,
  });

  return httpResponse(
    req,
    res,
    200,
    responseMessage.custom(`Successfully carried forward ${result.carriedForward} tasks`),
    result
  );
});

const getCarriedForward = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, projectId } = req.query;

  const result = await getCarriedForwardTasks(req.user.companyId, {
    page,
    limit,
    projectId,
  });

  return httpResponse(
    req,
    res,
    200,
    responseMessage.custom('Carried forward tasks fetched successfully'),
    result
  );
});

export {
  createTask,
  getTasks,
  getTask,
  updateTask,
  deleteTask,
  startTask,
  completeTask,
  reviewTask,
  runCarryForward,
  getCarriedForward,
};
