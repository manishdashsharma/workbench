import { httpError, responseMessage } from '../utils/response.js';

export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return httpError(req, res, new Error(responseMessage.ERROR.UNAUTHORIZED), 401);
    }

    if (!roles.includes(req.user.role)) {
      return httpError(req, res, new Error(responseMessage.ERROR.FORBIDDEN), 403);
    }

    return next();
  };
};

export const requireManager = (req, res, next) => {
  if (!req.user) {
    return httpError(req, res, new Error(responseMessage.ERROR.UNAUTHORIZED), 401);
  }

  if (req.user.role !== 'MANAGER') {
    return httpError(req, res, new Error('Manager access required'), 403);
  }

  return next();
};

export const requireEmployee = (req, res, next) => {
  if (!req.user) {
    return httpError(req, res, new Error(responseMessage.ERROR.UNAUTHORIZED), 401);
  }

  if (req.user.role !== 'EMPLOYEE') {
    return httpError(req, res, new Error('Employee access required'), 403);
  }

  return next();
};

export const requireOwnership = (getResourceOwnerId) => {
  return async (req, res, next) => {
    if (!req.user) {
      return httpError(req, res, new Error(responseMessage.ERROR.UNAUTHORIZED), 401);
    }

    const resourceOwnerId = await getResourceOwnerId(req);

    if (req.user.id !== resourceOwnerId) {
      if (req.user.role !== 'MANAGER') {
        return httpError(req, res, new Error('You do not have permission to access this resource'), 403);
      }
    }

    return next();
  };
};

export const requireProjectMember = (prisma) => {
  return async (req, res, next) => {
    if (!req.user) {
      return httpError(req, res, new Error(responseMessage.ERROR.UNAUTHORIZED), 401);
    }

    const projectId = req.params.projectId || req.body.projectId;

    if (!projectId) {
      return httpError(req, res, new Error('Project ID is required'), 400);
    }

    const membership = await prisma.projectMember.findFirst({
      where: {
        projectId,
        userId: req.user.id,
      },
    });

    if (!membership && req.user.role !== 'MANAGER') {
      return httpError(req, res, new Error('You are not a member of this project'), 403);
    }

    req.projectMembership = membership;
    return next();
  };
};

export const requireTaskAccess = (prisma) => {
  return async (req, res, next) => {
    if (!req.user) {
      return httpError(req, res, new Error(responseMessage.ERROR.UNAUTHORIZED), 401);
    }

    const taskId = req.params.taskId || req.params.id;

    if (!taskId) {
      return httpError(req, res, new Error('Task ID is required'), 400);
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: {
          include: {
            members: true,
          },
        },
      },
    });

    if (!task) {
      return httpError(req, res, new Error('Task not found'), 404);
    }

    const isCreator = task.createdById === req.user.id;
    const isAssignee = task.assignedToId === req.user.id;
    const isProjectMember = task.project.members.some(m => m.userId === req.user.id);
    const isManager = req.user.role === 'MANAGER';

    if (!isCreator && !isAssignee && !isProjectMember && !isManager) {
      return httpError(req, res, new Error('You do not have access to this task'), 403);
    }

    req.task = task;
    return next();
  };
};
