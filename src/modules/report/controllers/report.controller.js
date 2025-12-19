import { getPrisma } from '../../../config/databases.js';
import { httpResponse, responseMessage, httpError, asyncHandler } from '../../../shared/index.js';
import { EUserRoles } from '../../auth/constants/auth.contant.js';

const prisma = getPrisma();

const getCompanyReport = asyncHandler(async (req, res) => {
  if (req.user.role !== EUserRoles.MANAGER) {
    return httpError(req, res, new Error('Only managers can access company reports'), 403);
  }

  const { startDate, endDate } = req.query;

  const dateFilter = {};
  if (startDate && endDate) {
    dateFilter.createdAt = {
      gte: new Date(startDate),
      lte: new Date(endDate),
    };
  }

  const [
    totalEmployees,
    totalProjects,
    totalTasks,
    tasksByStatus,
    tasksByType,
  ] = await Promise.all([
    prisma.user.count({
      where: {
        companyId: req.user.companyId,
        role: EUserRoles.EMPLOYEE,
      }
    }),
    prisma.project.count({
      where: { companyId: req.user.companyId }
    }),
    prisma.task.count({
      where: {
        project: { companyId: req.user.companyId },
        ...dateFilter,
      }
    }),
    prisma.task.groupBy({
      by: ['status'],
      where: {
        project: { companyId: req.user.companyId },
        ...dateFilter,
      },
      _count: true,
    }),
    prisma.task.groupBy({
      by: ['type'],
      where: {
        project: { companyId: req.user.companyId },
        ...dateFilter,
      },
      _count: true,
    }),
  ]);

  const completedTasks = await prisma.task.findMany({
    where: {
      project: { companyId: req.user.companyId },
      status: { in: ['COMPLETED', 'REVIEWED'] },
      actualStartTime: { not: null },
      actualCompletedTime: { not: null },
      ...dateFilter,
    },
    select: {
      actualStartTime: true,
      actualCompletedTime: true,
      startTime: true,
      endTime: true,
    }
  });

  let totalAllocatedMinutes = 0;
  let totalActualMinutes = 0;
  let onTimeCount = 0;
  let lateCount = 0;

  completedTasks.forEach(task => {
    const allocatedMinutes = (task.endTime - task.startTime) / 1000 / 60;
    const actualMinutes = (task.actualCompletedTime - task.actualStartTime) / 1000 / 60;

    totalAllocatedMinutes += allocatedMinutes;
    totalActualMinutes += actualMinutes;

    if (task.actualCompletedTime <= task.endTime) {
      onTimeCount++;
    } else {
      lateCount++;
    }
  });

  const avgAllocatedTime = completedTasks.length > 0
    ? totalAllocatedMinutes / completedTasks.length
    : 0;
  const avgActualTime = completedTasks.length > 0
    ? totalActualMinutes / completedTasks.length
    : 0;
  const completedCount = (tasksByStatus.find((s) => s.status === 'COMPLETED')?._count || 0)
    + (tasksByStatus.find((s) => s.status === 'REVIEWED')?._count || 0);
  const completionRate = totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0;
  const onTimeRate = completedTasks.length > 0
    ? (onTimeCount / completedTasks.length) * 100
    : 0;

  return httpResponse(req, res, 200, responseMessage.custom('Company report fetched successfully'), {
    overview: {
      totalEmployees,
      totalProjects,
      totalTasks,
      completedTasks: completedTasks.length,
      completionRate: Math.round(completionRate * 100) / 100,
      onTimeRate: Math.round(onTimeRate * 100) / 100,
    },
    taskBreakdown: {
      byStatus: tasksByStatus,
      byType: tasksByType,
    },
    performance: {
      avgAllocatedTime: Math.round(avgAllocatedTime),
      avgActualTime: Math.round(avgActualTime),
      onTimeCount,
      lateCount,
    }
  });
});

const getProjectReport = asyncHandler(async (req, res) => {
  if (req.user.role !== EUserRoles.MANAGER) {
    return httpError(req, res, new Error('Only managers can access project reports'), 403);
  }

  const { projectId } = req.params;
  const { startDate, endDate } = req.query;

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      companyId: req.user.companyId,
    }
  });

  if (!project) {
    return httpError(req, res, new Error('Project not found'), 404);
  }

  const dateFilter = {};
  if (startDate && endDate) {
    dateFilter.createdAt = {
      gte: new Date(startDate),
      lte: new Date(endDate),
    };
  }

  const [
    totalMembers,
    totalTasks,
    tasksByStatus,
    tasksByAssignee,
  ] = await Promise.all([
    prisma.projectMember.count({
      where: { projectId }
    }),
    prisma.task.count({
      where: {
        projectId,
        ...dateFilter,
      }
    }),
    prisma.task.groupBy({
      by: ['status'],
      where: {
        projectId,
        ...dateFilter,
      },
      _count: true,
    }),
    prisma.task.groupBy({
      by: ['assignedToId'],
      where: {
        projectId,
        assignedToId: { not: null },
        ...dateFilter,
      },
      _count: true,
    }),
  ]);

  const completedTasks = await prisma.task.findMany({
    where: {
      projectId,
      status: { in: ['COMPLETED', 'REVIEWED'] },
      actualStartTime: { not: null },
      actualCompletedTime: { not: null },
      ...dateFilter,
    },
    select: {
      actualStartTime: true,
      actualCompletedTime: true,
      startTime: true,
      endTime: true,
      assignedTo: {
        select: {
          id: true,
          name: true,
        }
      }
    }
  });

  let totalAllocatedMinutes = 0;
  let totalActualMinutes = 0;
  let onTimeCount = 0;

  completedTasks.forEach(task => {
    const allocatedMinutes = (task.endTime - task.startTime) / 1000 / 60;
    const actualMinutes = (task.actualCompletedTime - task.actualStartTime) / 1000 / 60;

    totalAllocatedMinutes += allocatedMinutes;
    totalActualMinutes += actualMinutes;

    if (task.actualCompletedTime <= task.endTime) {
      onTimeCount++;
    }
  });

  const avgAllocatedTime = completedTasks.length > 0
    ? totalAllocatedMinutes / completedTasks.length
    : 0;
  const avgActualTime = completedTasks.length > 0
    ? totalActualMinutes / completedTasks.length
    : 0;
  const projectCompletedCount = (
    (tasksByStatus.find((s) => s.status === 'COMPLETED')?._count || 0)
    + (tasksByStatus.find((s) => s.status === 'REVIEWED')?._count || 0)
  );
  const completionRate = totalTasks > 0
    ? (projectCompletedCount / totalTasks) * 100
    : 0;

  const assigneeDetails = await Promise.all(
    tasksByAssignee.map(async (item) => {
      const user = await prisma.user.findUnique({
        where: { id: item.assignedToId },
        select: { id: true, name: true, email: true }
      });

      const userCompletedTasks = completedTasks.filter(
        (t) => t.assignedTo?.id === item.assignedToId
      );
      const userOnTime = userCompletedTasks.filter(
        (t) => t.actualCompletedTime <= t.endTime
      ).length;
      const userOnTimeRate = userCompletedTasks.length > 0
        ? (userOnTime / userCompletedTasks.length) * 100
        : 0;

      return {
        user,
        totalTasks: item._count,
        completedTasks: userCompletedTasks.length,
        onTimeRate: userOnTimeRate,
      };
    })
  );

  return httpResponse(req, res, 200, responseMessage.custom('Project report fetched successfully'), {
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
    },
    overview: {
      totalMembers,
      totalTasks,
      completedTasks: completedTasks.length,
      completionRate: Math.round(completionRate * 100) / 100,
    },
    taskBreakdown: {
      byStatus: tasksByStatus,
    },
    performance: {
      avgAllocatedTime: Math.round(avgAllocatedTime),
      avgActualTime: Math.round(avgActualTime),
      onTimeCount,
      lateCount: completedTasks.length - onTimeCount,
    },
    memberPerformance: assigneeDetails,
  });
});

const getEmployeeReport = asyncHandler(async (req, res) => {
  if (req.user.role !== EUserRoles.MANAGER) {
    return httpError(req, res, new Error('Only managers can access employee reports'), 403);
  }

  const { employeeId } = req.params;
  const { startDate, endDate } = req.query;

  const employee = await prisma.user.findFirst({
    where: {
      id: employeeId,
      companyId: req.user.companyId,
      role: EUserRoles.EMPLOYEE,
    }
  });

  if (!employee) {
    return httpError(req, res, new Error('Employee not found'), 404);
  }

  const dateFilter = {};
  if (startDate && endDate) {
    dateFilter.createdAt = {
      gte: new Date(startDate),
      lte: new Date(endDate),
    };
  }

  const [
    totalProjects,
    totalTasks,
    tasksByStatus,
    tasksByProject,
  ] = await Promise.all([
    prisma.projectMember.count({
      where: { userId: employeeId }
    }),
    prisma.task.count({
      where: {
        assignedToId: employeeId,
        ...dateFilter,
      }
    }),
    prisma.task.groupBy({
      by: ['status'],
      where: {
        assignedToId: employeeId,
        ...dateFilter,
      },
      _count: true,
    }),
    prisma.task.groupBy({
      by: ['projectId'],
      where: {
        assignedToId: employeeId,
        ...dateFilter,
      },
      _count: true,
    }),
  ]);

  const completedTasks = await prisma.task.findMany({
    where: {
      assignedToId: employeeId,
      status: { in: ['COMPLETED', 'REVIEWED'] },
      actualStartTime: { not: null },
      actualCompletedTime: { not: null },
      ...dateFilter,
    },
    select: {
      id: true,
      title: true,
      actualStartTime: true,
      actualCompletedTime: true,
      startTime: true,
      endTime: true,
      project: {
        select: {
          id: true,
          name: true,
        }
      }
    }
  });

  let totalAllocatedMinutes = 0;
  let totalActualMinutes = 0;
  let onTimeCount = 0;
  let earlyCount = 0;
  let lateCount = 0;

  const taskDetails = completedTasks.map(task => {
    const allocatedMinutes = (task.endTime - task.startTime) / 1000 / 60;
    const actualMinutes = (task.actualCompletedTime - task.actualStartTime) / 1000 / 60;
    const variance = actualMinutes - allocatedMinutes;

    totalAllocatedMinutes += allocatedMinutes;
    totalActualMinutes += actualMinutes;

    if (task.actualCompletedTime < task.endTime) {
      earlyCount++;
      onTimeCount++;
    } else if (task.actualCompletedTime.getTime() === task.endTime.getTime()) {
      onTimeCount++;
    } else {
      lateCount++;
    }

    return {
      id: task.id,
      title: task.title,
      project: task.project,
      allocatedMinutes: Math.round(allocatedMinutes),
      actualMinutes: Math.round(actualMinutes),
      variance: Math.round(variance),
      startTime: task.startTime,
      endTime: task.endTime,
      actualStartTime: task.actualStartTime,
      actualCompletedTime: task.actualCompletedTime,
      status: task.actualCompletedTime <= task.endTime ? 'On Time' : 'Late',
    };
  });

  const avgAllocatedTime = completedTasks.length > 0
    ? totalAllocatedMinutes / completedTasks.length
    : 0;
  const avgActualTime = completedTasks.length > 0
    ? totalActualMinutes / completedTasks.length
    : 0;
  const completedCount = (tasksByStatus.find((s) => s.status === 'COMPLETED')?._count || 0)
    + (tasksByStatus.find((s) => s.status === 'REVIEWED')?._count || 0);
  const completionRate = totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0;
  const onTimeRate = completedTasks.length > 0
    ? (onTimeCount / completedTasks.length) * 100
    : 0;

  const projectDetails = await Promise.all(
    tasksByProject.map(async (item) => {
      const project = await prisma.project.findUnique({
        where: { id: item.projectId },
        select: { id: true, name: true }
      });
      return {
        project,
        totalTasks: item._count,
      };
    })
  );

  return httpResponse(req, res, 200, responseMessage.custom('Employee report fetched successfully'), {
    employee: {
      id: employee.id,
      name: employee.name,
      email: employee.email,
    },
    overview: {
      totalProjects,
      totalTasks,
      completedTasks: completedTasks.length,
      completionRate: Math.round(completionRate * 100) / 100,
      onTimeRate: Math.round(onTimeRate * 100) / 100,
    },
    taskBreakdown: {
      byStatus: tasksByStatus,
      byProject: projectDetails,
    },
    performance: {
      avgAllocatedTime: Math.round(avgAllocatedTime),
      avgActualTime: Math.round(avgActualTime),
      earlyCount,
      onTimeCount,
      lateCount,
      efficiency: avgAllocatedTime > 0 ? Math.round((avgAllocatedTime / avgActualTime) * 100) : 0,
    },
    recentCompletedTasks: taskDetails.slice(0, 10),
  });
});

const getMyReport = asyncHandler(async (req, res) => {
  if (req.user.role !== EUserRoles.EMPLOYEE) {
    return httpError(req, res, new Error('Only employees can access their report'), 403);
  }

  const { startDate, endDate } = req.query;

  const dateFilter = {};
  if (startDate && endDate) {
    dateFilter.createdAt = {
      gte: new Date(startDate),
      lte: new Date(endDate),
    };
  }

  const [
    myProjects,
    totalTasks,
    tasksByStatus,
    tasksByProject,
  ] = await Promise.all([
    prisma.projectMember.findMany({
      where: { userId: req.user.id },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            description: true,
          }
        }
      }
    }),
    prisma.task.count({
      where: {
        assignedToId: req.user.id,
        ...dateFilter,
      }
    }),
    prisma.task.groupBy({
      by: ['status'],
      where: {
        assignedToId: req.user.id,
        ...dateFilter,
      },
      _count: true,
    }),
    prisma.task.groupBy({
      by: ['projectId'],
      where: {
        assignedToId: req.user.id,
        ...dateFilter,
      },
      _count: true,
    }),
  ]);

  const completedTasks = await prisma.task.findMany({
    where: {
      assignedToId: req.user.id,
      status: { in: ['COMPLETED', 'REVIEWED'] },
      actualStartTime: { not: null },
      actualCompletedTime: { not: null },
      ...dateFilter,
    },
    select: {
      id: true,
      title: true,
      actualStartTime: true,
      actualCompletedTime: true,
      startTime: true,
      endTime: true,
      status: true,
      project: {
        select: {
          id: true,
          name: true,
        }
      }
    },
    orderBy: {
      actualCompletedTime: 'desc',
    },
    take: 10,
  });

  let totalAllocatedMinutes = 0;
  let totalActualMinutes = 0;
  let onTimeCount = 0;
  let earlyCount = 0;
  let lateCount = 0;

  const taskDetails = completedTasks.map(task => {
    const allocatedMinutes = (task.endTime - task.startTime) / 1000 / 60;
    const actualMinutes = (task.actualCompletedTime - task.actualStartTime) / 1000 / 60;
    const variance = actualMinutes - allocatedMinutes;

    totalAllocatedMinutes += allocatedMinutes;
    totalActualMinutes += actualMinutes;

    if (task.actualCompletedTime < task.endTime) {
      earlyCount++;
      onTimeCount++;
    } else if (task.actualCompletedTime.getTime() === task.endTime.getTime()) {
      onTimeCount++;
    } else {
      lateCount++;
    }

    return {
      id: task.id,
      title: task.title,
      project: task.project,
      allocatedMinutes: Math.round(allocatedMinutes),
      actualMinutes: Math.round(actualMinutes),
      variance: Math.round(variance),
      startTime: task.startTime,
      endTime: task.endTime,
      actualStartTime: task.actualStartTime,
      actualCompletedTime: task.actualCompletedTime,
      deliveryStatus: task.actualCompletedTime <= task.endTime ? 'On Time' : 'Late',
      reviewStatus: task.status === 'REVIEWED' ? 'Reviewed' : 'Pending Review',
    };
  });

  const avgAllocatedTime = completedTasks.length > 0
    ? totalAllocatedMinutes / completedTasks.length
    : 0;
  const avgActualTime = completedTasks.length > 0
    ? totalActualMinutes / completedTasks.length
    : 0;
  const completedCount = (tasksByStatus.find((s) => s.status === 'COMPLETED')?._count || 0)
    + (tasksByStatus.find((s) => s.status === 'REVIEWED')?._count || 0);
  const completionRate = totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0;
  const onTimeRate = completedTasks.length > 0
    ? (onTimeCount / completedTasks.length) * 100
    : 0;

  const projectDetails = await Promise.all(
    tasksByProject.map(async (item) => {
      const project = await prisma.project.findUnique({
        where: { id: item.projectId },
        select: { id: true, name: true }
      });

      const projectTasks = await prisma.task.findMany({
        where: {
          projectId: item.projectId,
          assignedToId: req.user.id,
          status: { in: ['COMPLETED', 'REVIEWED'] },
          actualStartTime: { not: null },
          actualCompletedTime: { not: null },
        }
      });

      const projectOnTime = projectTasks.filter(t => t.actualCompletedTime <= t.endTime).length;

      return {
        project,
        totalTasks: item._count,
        completedTasks: projectTasks.length,
        onTimeRate: projectTasks.length > 0 ? (projectOnTime / projectTasks.length) * 100 : 0,
      };
    })
  );

  return httpResponse(req, res, 200, responseMessage.custom('Your report fetched successfully'), {
    overview: {
      totalProjects: myProjects.length,
      totalTasks,
      completedTasks: completedTasks.length,
      completionRate: Math.round(completionRate * 100) / 100,
      onTimeRate: Math.round(onTimeRate * 100) / 100,
    },
    taskBreakdown: {
      byStatus: tasksByStatus,
      byProject: projectDetails,
    },
    performance: {
      avgAllocatedTime: Math.round(avgAllocatedTime),
      avgActualTime: Math.round(avgActualTime),
      earlyCount,
      onTimeCount,
      lateCount,
      efficiency: avgAllocatedTime > 0 ? Math.round((avgAllocatedTime / avgActualTime) * 100) : 0,
    },
    recentCompletedTasks: taskDetails,
    myProjects: myProjects.map(pm => pm.project),
  });
});

export {
  getCompanyReport,
  getProjectReport,
  getEmployeeReport,
  getMyReport,
};
