import { getPrisma } from '../../../config/databases.js';
import { logger } from '../../../shared/index.js';

const prisma = getPrisma();

export const carryForwardIncompleteTasks = async () => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const incompleteTasks = await prisma.task.findMany({
      where: {
        status: {
          in: ['PENDING', 'IN_PROGRESS'],
        },
        endTime: {
          lt: now,
        },
        isCarriedForward: false,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            companyId: true,
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

    if (incompleteTasks.length === 0) {
      logger.info('No incomplete tasks to carry forward');
      return {
        success: true,
        carriedForward: 0,
        tasks: [],
      };
    }

    const updatedTasks = [];

    for (const task of incompleteTasks) {
      const originalDuration = task.endTime - task.startTime;
      const newStartTime = startOfToday;
      const newEndTime = new Date(newStartTime.getTime() + originalDuration);

      const updatedTask = await prisma.task.update({
        where: { id: task.id },
        data: {
          isCarriedForward: true,
          originalDueDate: task.endTime,
          startTime: newStartTime,
          endTime: newEndTime,
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

      updatedTasks.push({
        taskId: updatedTask.id,
        title: updatedTask.title,
        project: updatedTask.project,
        assignedTo: updatedTask.assignedTo,
        originalEndTime: task.endTime,
        newStartTime,
        newEndTime,
      });

      logger.info('Task carried forward', {
        taskId: task.id,
        title: task.title,
        projectId: task.projectId,
        assignedToId: task.assignedToId,
        originalEndTime: task.endTime,
        newStartTime,
        newEndTime,
      });
    }

    logger.info(`Successfully carried forward ${updatedTasks.length} tasks`);

    return {
      success: true,
      carriedForward: updatedTasks.length,
      tasks: updatedTasks,
    };
  } catch (error) {
    logger.error('Error carrying forward tasks', {
      error: error.message,
      stack: error.stack,
    });

    throw error;
  }
};

export const getCarriedForwardTasks = async (companyId, options = {}) => {
  const { page = 1, limit = 20, projectId } = options;

  const where = {
    isCarriedForward: true,
    project: { companyId },
  };

  if (projectId) {
    where.projectId = projectId;
  }

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
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

  return {
    tasks,
    pagination: {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      total,
      totalPages: Math.ceil(total / parseInt(limit, 10))
    }
  };
};
