import { getPrisma, getRedisClient } from '../../config/databases.js';
import { httpError, responseMessage } from '../utils/response.js';
import { verifyAccessToken } from '../services/auth/jwt.js';
import logger from '../utils/logger.js';

const prisma = getPrisma();

export const authenticate = async (req, res, next) => {
  try {
    let token;

    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken.trim();
    }

    if (!token) {
      return httpError(req, res, new Error(responseMessage.ERROR.UNAUTHORIZED), 401);
    }

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return httpError(req, res, new Error('Access token expired'), 401);
      }
      if (error.name === 'JsonWebTokenError') {
        return httpError(req, res, new Error('Invalid access token'), 401);
      }
      throw error;
    }

    const redis = getRedisClient();
    const cacheKey = `user:${decoded.userId}`;

    let cachedUser;
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        cachedUser = JSON.parse(cached);
      }
    } catch (redisError) {
      logger.error('Redis cache error:', redisError);
    }

    if (cachedUser) {
      req.user = cachedUser;
      return next();
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        companyId: true,
      },
    });

    if (!user) {
      return httpError(req, res, new Error('User not found'), 401);
    }

    const userPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      companyId: user.companyId,
    };

    try {
      await redis.set(cacheKey, JSON.stringify(userPayload), 'EX', 3600);
    } catch (redisCacheError) {
      logger.error('Redis cache set error:', redisCacheError);
    }

    req.user = userPayload;

    return next();
  } catch (error) {
    logger.error('Authentication error:', error);
    return httpError(req, res, new Error(responseMessage.ERROR.INTERNAL_SERVER_ERROR), 500);
  }
};

export const optionalAuth = async (req, res, next) => {
  try {
    let token;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken.trim();
    }

    if (!token) {
      req.user = null;
      return next();
    }

    try {
      const decoded = verifyAccessToken(token);

      const redis = getRedisClient();
      const cacheKey = `user:${decoded.userId}`;

      let cachedUser;
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          cachedUser = JSON.parse(cached);
        }
      } catch (redisError) {
        logger.error('Redis cache error:', redisError);
      }

      if (cachedUser) {
        req.user = cachedUser;
        return next();
      }

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          companyId: true,
        },
      });

      if (user) {
        const userPayload = {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          companyId: user.companyId,
        };

        try {
          await redis.set(cacheKey, JSON.stringify(userPayload), 'EX', 3600);
        } catch (redisCacheError) {
          logger.error('Redis cache set error:', redisCacheError);
        }

        req.user = userPayload;
      } else {
        req.user = null;
      }
    } catch (authError) {
      logger.error('Optional auth error:', authError);
      req.user = null;
    }

    return next();
  } catch {
    req.user = null;
    return next();
  }
};
