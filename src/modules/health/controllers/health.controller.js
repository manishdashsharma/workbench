import { checkDatabaseHealth } from '../../../config/databases.js';
import { httpResponse, responseMessage, httpError, asyncHandler, logger } from '../../../shared/index.js';
import config from '../../../config/index.js';

const healthCheck = asyncHandler(async (req, res) => {
  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.env,
    version: process.env.npm_package_version || '1.0.0',
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      external: Math.round(process.memoryUsage().external / 1024 / 1024),
    },
    cpu: {
      usage: process.cpuUsage(),
    },
  };

  return httpResponse(
    req,
    res,
    200,
    responseMessage.SUCCESS.HEALTH_CHECK,
    healthData
  );
});

const detailedHealthCheck = asyncHandler(async (req, res) => {
  const startTime = Date.now();

  const dbHealth = await checkDatabaseHealth();

  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.env,
    version: process.env.npm_package_version || '1.0.0',
    responseTime: Date.now() - startTime,
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      external: Math.round(process.memoryUsage().external / 1024 / 1024),
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
    },
    cpu: {
      usage: process.cpuUsage(),
    },
    databases: dbHealth,
  };

  const hasErrors = dbHealth.errors && dbHealth.errors.length > 0;
  const dbConnected = dbHealth.postgresql.write && dbHealth.postgresql.read;

  if (hasErrors || !dbConnected) {
    healthData.status = 'degraded';
    return httpError(req, res, new Error('Service is degraded'), 503);
  }

  return httpResponse(
    req,
    res,
    200,
    responseMessage.SUCCESS.HEALTH_CHECK,
    healthData
  );
});

const readyCheck = asyncHandler(async (req, res) => {
  const dbHealth = await checkDatabaseHealth();

  const isReady = dbHealth.postgresql.write && dbHealth.postgresql.read;

  if (!isReady) {
    return httpError(req, res, new Error('Service is not ready'), 503);
  }

  return httpResponse(req, res, 200, responseMessage.SUCCESS.READY, {
    status: 'ready',
    timestamp: new Date().toISOString(),
  });
});

const liveCheck = asyncHandler(async (req, res) => {
  return httpResponse(req, res, 200, responseMessage.SUCCESS.ALIVE, {
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

const databaseHealthCheck = asyncHandler(async (req, res) => {
  const dbHealth = await checkDatabaseHealth();

  return httpResponse(
    req,
    res,
    200,
    'Database health check completed',
    dbHealth
  );
});

const fullSystemStatus = asyncHandler(async (req, res) => {
  const startTime = Date.now();

  try {
    const dbHealth = await checkDatabaseHealth();
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    const hasDbErrors = dbHealth.errors && dbHealth.errors.length > 0;
    const dbConnected = dbHealth.postgresql.write && dbHealth.postgresql.read;
    const redisConnected = dbHealth.redis.connected;

    let systemStatus = 'healthy';
    if (hasDbErrors || !dbConnected) {
      systemStatus = 'unhealthy';
    } else if (!redisConnected) {
      systemStatus = 'degraded';
    }

    const responseTime = Date.now() - startTime;

    const statusData = {
      timestamp: new Date().toISOString(),
      status: systemStatus,
      uptime: process.uptime(),
      environment: config.env,
      version: process.env.npm_package_version || '1.0.0',
      responseTime,
      memory: {
        used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024),
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
      },
      databases: dbHealth,
      nodeInfo: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        pid: process.pid,
      },
      requestId: req.requestId,
    };

    const statusCode
      = systemStatus === 'healthy'
        ? 200
        : systemStatus === 'degraded'
          ? 202
          : 503;

    return httpResponse(
      req,
      res,
      statusCode,
      `System status: ${systemStatus}`,
      statusData
    );
  } catch (error) {
    logger.error('Error in fullSystemStatus', {
      error: error.message,
      stack: error.stack,
      requestId: req.requestId,
    });

    return httpError(
      req,
      res,
      new Error('Failed to retrieve system status'),
      500
    );
  }
});

// Disabled - MongoDB not in use
// const getSystemStatus = asyncHandler(async (req, res) => {
//   return httpError(
//     req,
//     res,
//     new Error('System status history is not available'),
//     501
//   );
// });

export {
  healthCheck,
  detailedHealthCheck,
  readyCheck,
  liveCheck,
  databaseHealthCheck,
  fullSystemStatus,
};
