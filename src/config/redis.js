import Redis from 'ioredis';
import config from './index.js';
import { logger } from '../shared/index.js';

let redisCluster;
let redisClient;

function initializeRedis() {
  if (redisCluster) {
    return { cluster: redisCluster, client: redisClient };
  }

  try {
    if (config.redis.clusterUrls.length > 1) {
      const nodes = config.redis.clusterUrls.map((url) => {
        const parsed = new URL(url);
        return {
          host: parsed.hostname,
          port: parseInt(parsed.port, 10) || 6379,
        };
      });

      redisCluster = new Redis.Cluster(nodes, {
        redisOptions: {
          password: config.redis.password,
          connectTimeout: 10000,
          lazyConnect: true,
          maxRetriesPerRequest: 3,
          retryDelayOnFailover: 100,
        },
        enableOfflineQueue: false,
        maxRetriesPerRequest: 3,
        retryDelayOnFailover: 100,
        scaleReads: 'slave',
      });

      redisClient = redisCluster;

      redisCluster.on('connect', () => {
        logger.info('Redis cluster connected successfully');
      });

      redisCluster.on('error', (error) => {
        logger.error('Redis cluster error:', error);
      });

      redisCluster.on('ready', () => {
        logger.info('Redis cluster ready');
      });

      redisCluster.on('reconnecting', () => {
        logger.info('Redis cluster reconnecting');
      });
    } else if (config.redis.clusterUrls.length === 1) {
      const url = config.redis.clusterUrls[0];
      redisClient = new Redis(url, {
        connectTimeout: 10000,
        lazyConnect: true,
        maxRetriesPerRequest: 3,
        retryDelayOnFailover: 100,
      });

      redisClient.on('connect', () => {
        logger.info('Redis connected successfully');
      });

      redisClient.on('error', (error) => {
        logger.error('Redis error:', error);
      });

      redisClient.on('ready', () => {
        logger.info('Redis ready');
      });

      redisClient.on('reconnecting', () => {
        logger.info('Redis reconnecting');
      });
    } else {
      logger.warn('No Redis URLs configured, Redis will not be available');
    }
  } catch (error) {
    logger.error('Failed to initialize Redis:', error);
  }

  return { cluster: redisCluster, client: redisClient };
}

function getRedisClient() {
  if (!redisClient) {
    const { client } = initializeRedis();
    return client;
  }
  return redisClient;
}

class CacheManager {
  constructor() {
    this.client = getRedisClient();
  }

  async get(key) {
    if (!this.client) {
      return null;
    }

    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  async set(key, value, ttl = 3600) {
    if (!this.client) {
      return false;
    }

    try {
      await this.client.setex(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error('Cache set error:', error);
      return false;
    }
  }

  async del(key) {
    if (!this.client) {
      return false;
    }

    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error('Cache delete error:', error);
      return false;
    }
  }

  async exists(key) {
    if (!this.client) {
      return false;
    }

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Cache exists error:', error);
      return false;
    }
  }

  async flushall() {
    if (!this.client) {
      return false;
    }

    try {
      await this.client.flushall();
      return true;
    } catch (error) {
      logger.error('Cache flush error:', error);
      return false;
    }
  }

  async keys(pattern = '*') {
    if (!this.client) {
      return [];
    }

    try {
      return await this.client.keys(pattern);
    } catch (error) {
      logger.error('Cache keys error:', error);
      return [];
    }
  }

  async incr(key, ttl = 3600) {
    if (!this.client) {
      return 0;
    }

    try {
      const value = await this.client.incr(key);
      if (value === 1) {
        await this.client.expire(key, ttl);
      }
      return value;
    } catch (error) {
      logger.error('Cache incr error:', error);
      return 0;
    }
  }

  async decr(key) {
    if (!this.client) {
      return 0;
    }

    try {
      return await this.client.decr(key);
    } catch (error) {
      logger.error('Cache decr error:', error);
      return 0;
    }
  }

  async hset(key, field, value) {
    if (!this.client) {
      return false;
    }

    try {
      await this.client.hset(key, field, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error('Cache hset error:', error);
      return false;
    }
  }

  async hget(key, field) {
    if (!this.client) {
      return null;
    }

    try {
      const value = await this.client.hget(key, field);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Cache hget error:', error);
      return null;
    }
  }

  async hdel(key, field) {
    if (!this.client) {
      return false;
    }

    try {
      await this.client.hdel(key, field);
      return true;
    } catch (error) {
      logger.error('Cache hdel error:', error);
      return false;
    }
  }

  async hgetall(key) {
    if (!this.client) {
      return {};
    }

    try {
      const result = await this.client.hgetall(key);
      const parsed = {};
      for (const [field, value] of Object.entries(result)) {
        try {
          parsed[field] = JSON.parse(value);
        } catch {
          parsed[field] = value;
        }
      }
      return parsed;
    } catch (error) {
      logger.error('Cache hgetall error:', error);
      return {};
    }
  }
}

class SessionManager {
  constructor() {
    this.client = getRedisClient();
    this.prefix = 'session:';
  }

  async createSession(userId, sessionData, ttl = 86400) {
    if (!this.client) {
      return null;
    }

    try {
      const sessionId = `${userId}:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
      const key = this.prefix + sessionId;

      await this.client.setex(
        key,
        ttl,
        JSON.stringify({
          userId,
          ...sessionData,
          createdAt: new Date().toISOString(),
        })
      );

      return sessionId;
    } catch (error) {
      logger.error('Session create error:', error);
      return null;
    }
  }

  async getSession(sessionId) {
    if (!this.client) {
      return null;
    }

    try {
      const key = this.prefix + sessionId;
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Session get error:', error);
      return null;
    }
  }

  async updateSession(sessionId, sessionData, ttl = 86400) {
    if (!this.client) {
      return false;
    }

    try {
      const key = this.prefix + sessionId;
      const existing = await this.getSession(sessionId);

      if (!existing) {
        return false;
      }

      await this.client.setex(
        key,
        ttl,
        JSON.stringify({
          ...existing,
          ...sessionData,
          updatedAt: new Date().toISOString(),
        })
      );

      return true;
    } catch (error) {
      logger.error('Session update error:', error);
      return false;
    }
  }

  async deleteSession(sessionId) {
    if (!this.client) {
      return false;
    }

    try {
      const key = this.prefix + sessionId;
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error('Session delete error:', error);
      return false;
    }
  }

  async getUserSessions(userId) {
    if (!this.client) {
      return [];
    }

    try {
      const pattern = `${this.prefix}${userId}:*`;
      const keys = await this.client.keys(pattern);

      if (keys.length === 0) {
        return [];
      }

      const sessions = await this.client.mget(keys);
      return sessions
        .filter(Boolean)
        .map((session) => JSON.parse(session))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (error) {
      logger.error('Session get user sessions error:', error);
      return [];
    }
  }

  async deleteUserSessions(userId) {
    if (!this.client) {
      return false;
    }

    try {
      const pattern = `${this.prefix}${userId}:*`;
      const keys = await this.client.keys(pattern);

      if (keys.length > 0) {
        await this.client.del(...keys);
      }

      return true;
    } catch (error) {
      logger.error('Session delete user sessions error:', error);
      return false;
    }
  }
}

async function checkRedisHealth() {
  const health = {
    connected: false,
    latency: null,
    error: null,
  };

  try {
    const client = getRedisClient();
    if (!client) {
      health.error = 'Redis client not initialized';
      return health;
    }

    const start = Date.now();
    await client.ping();
    health.connected = true;
    health.latency = Date.now() - start;
  } catch (error) {
    health.error = error.message;
  }

  return health;
}

async function disconnectRedis() {
  try {
    if (redisClient) {
      await redisClient.disconnect();
    }
    if (redisCluster) {
      await redisCluster.disconnect();
    }
  } catch (error) {
    logger.error('Error disconnecting from Redis:', error);
  }
}

export {
  initializeRedis,
  getRedisClient,
  CacheManager,
  SessionManager,
  checkRedisHealth,
  disconnectRedis,
};
