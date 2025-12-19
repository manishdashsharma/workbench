import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import config from './index.js';
import { logger } from '../shared/index.js';

let prisma;
let readPrisma;
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

  if (!readPrisma && config.database.readUrl) {
    readPrisma = new PrismaClient({
      datasources: {
        db: {
          url: config.database.readUrl,
        },
      },
      log:
        config.env === 'development'
          ? ['query', 'info', 'warn', 'error']
          : ['error'],
    });
  }

  return { prisma, readPrisma: readPrisma || prisma };
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

    const { prisma: writeDB, readPrisma: readDB } = initializePrisma();
    await writeDB.$connect();
    logger.success('PostgreSQL (write) connected');

    if (readDB !== writeDB) {
      try {
        await readDB.$connect();
        logger.success('PostgreSQL (read) connected');
      } catch (readError) {
        logger.warn(`⚠️  PostgreSQL (read) connection failed, falling back to write DB: ${readError.message}`);
        readPrisma = null;
      }
    }

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

function getWriteDB() {
  if (!prisma) {
    const { prisma: writeDB } = initializePrisma();
    return writeDB;
  }
  return prisma;
}

function getReadDB() {
  if (!readPrisma) {
    const { readPrisma: readDB } = initializePrisma();
    return readDB;
  }
  return readPrisma;
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
      write: false,
      read: false,
      writeLatency: null,
      readLatency: null,
    },
    redis: { connected: false, latency: null },
    errors: [],
  };

  try {
    const writeStart = Date.now();
    await getWriteDB().$queryRaw`SELECT 1`;
    health.postgresql.write = true;
    health.postgresql.writeLatency = Date.now() - writeStart;

    const readStart = Date.now();
    await getReadDB().$queryRaw`SELECT 1`;
    health.postgresql.read = true;
    health.postgresql.readLatency = Date.now() - readStart;
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
      logger.info('✅ PostgreSQL (write) disconnected');
    }
    if (readPrisma) {
      await readPrisma.$disconnect();
      logger.info('✅ PostgreSQL (read) disconnected');
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
  getWriteDB,
  getReadDB,
  getRedisClient,
  checkDatabaseHealth,
};
