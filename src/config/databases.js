import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import config from './index.js';
import { logger } from '../shared/index.js';

let prisma;
let redisCluster;

function initializePrisma() {
  if (!prisma) {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: config.database.url,
        },
      },
      log:
        config.env === 'development'
          ? ['query', 'info', 'warn', 'error']
          : ['error'],
    });
  }

  return prisma;
}

function initializeRedis() {
  if (!redisCluster && config.redis.clusterUrls.length > 0) {
    if (config.redis.clusterUrls.length === 1) {
      redisCluster = new Redis(config.redis.clusterUrls[0]);
    } else {
      redisCluster = new Redis.Cluster(
        config.redis.clusterUrls.map((url) => {
          const urlObj = new URL(url);
          return {
            host: urlObj.hostname,
            port: urlObj.port || 6379,
          };
        })
      );
    }
  }
  return redisCluster;
}

async function connectDatabases() {
  try {
    logger.info('🔌 Connecting to databases...');

    const db = initializePrisma();
    await db.$connect();
    logger.success('PostgreSQL connected');

    if (config.redis.clusterUrls.length > 0) {
      const redis = initializeRedis();
      await redis.ping();
      logger.success('Redis connected');
    }

    logger.success('All databases connected successfully');
  } catch (error) {
    logger.error(`❌ Database connection failed: ${error.message}`);
    throw error;
  }
}

function getPrisma() {
  if (!prisma) {
    return initializePrisma();
  }
  return prisma;
}

function getRedisClient() {
  if (!redisCluster) {
    return initializeRedis();
  }
  return redisCluster;
}

async function checkDatabaseHealth() {
  const health = {
    postgresql: {
      connected: false,
      latency: null,
    },
    redis: { connected: false, latency: null },
    errors: [],
  };

  try {
    const dbStart = Date.now();
    await getPrisma().$queryRaw`SELECT 1`;
    health.postgresql.connected = true;
    health.postgresql.latency = Date.now() - dbStart;
  } catch (error) {
    health.errors.push(`PostgreSQL: ${error.message}`);
  }

  try {
    if (config.redis.clusterUrls.length > 0) {
      const redisStart = Date.now();
      await getRedisClient().ping();
      health.redis.connected = true;
      health.redis.latency = Date.now() - redisStart;
    }
  } catch (error) {
    health.errors.push(`Redis: ${error.message}`);
  }

  return health;
}

async function disconnectDatabases() {
  try {
    logger.info('Disconnecting from databases...');

    if (prisma) {
      await prisma.$disconnect();
      logger.info('✅ PostgreSQL disconnected');
    }
    if (redisCluster) {
      redisCluster.disconnect();
      logger.info('✅ Redis disconnected');
    }

    logger.info('🎉 All databases disconnected successfully');
  } catch (error) {
    logger.error('❌ Error disconnecting from databases:', error);
  }
}

export {
  connectDatabases,
  disconnectDatabases,
  getPrisma,
  getRedisClient,
  checkDatabaseHealth,
};
