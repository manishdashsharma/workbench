import { getWriteDB } from '../../../config/databases.js';
import { CacheManager } from '../../../config/redis.js';
import { sendEmail } from '../../../config/email.js';
import config from '../../../config/index.js';
import { httpResponse, responseMessage, httpError, asyncHandler, hashPassword, logger, comparePassword, generateTokens, forgotPasswordTemplate, passwordResetSuccessTemplate } from '../../../shared/index.js';
import { EUserRoles } from '../constants/auth.contant.js';

const prisma = getWriteDB();
const cache = new CacheManager();

const health = asyncHandler(async (req, res) => {
  return httpResponse(req, res, 200, responseMessage.custom('Authentication module is healthy'), {
    module: 'auth',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    return httpError(req, res, new Error('User already exists with this email'), 400);
  }

  const hashedPassword = await hashPassword(password);

  const newUser = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: role || EUserRoles.EMPLOYEE
    }
  });

  logger.info('User registered successfully', {
    userId: newUser.id,
    email: newUser.email,
    requestId: req.requestId,
  });

  return httpResponse(req, res, 201, responseMessage.custom('User registered successfully'));
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      password: true
    }
  });

  if (!user || !user.password) {
    return httpError(req, res, new Error('Invalid email or password'), 401);
  }

  const isPasswordValid = await comparePassword(password, user.password);
  if (!isPasswordValid) {
    return httpError(req, res, new Error('Invalid email or password'), 401);
  }

  const ipAddress = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
  const userAgent = req.headers['user-agent'];

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        isActive: true
      }
    }),
    prisma.userActivity.create({
      data: {
        userId: user.id,
        type: 'LOGIN',
        ipAddress,
        userAgent
      }
    })
  ]);

  const tokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    isActive: true
  };

  const { accessToken } = generateTokens(tokenPayload);

  const cookieOptions = {
    httpOnly: true,
    secure: config.env === 'production',
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'strict'
  };

  res.cookie('accessToken', accessToken, cookieOptions);

  logger.info('User logged in successfully', {
    userId: user.id,
    email: user.email,
    ipAddress,
    requestId: req.requestId
  });

  return httpResponse(req, res, 200, responseMessage.custom('Login successful'), {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    },
    accessToken
  });
});

const logout = asyncHandler(async (req, res) => {
  const ipAddress = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
  const userAgent = req.headers['user-agent'];

  await prisma.$transaction([
    prisma.user.update({
      where: { id: req.user.id },
      data: {
        isActive: false
      }
    }),
    prisma.userActivity.create({
      data: {
        userId: req.user.id,
        type: 'LOGOUT',
        ipAddress,
        userAgent
      }
    })
  ]);

  await cache.invalidateUserCache(req.user.id, {
    requestId: req.requestId
  });

  res.clearCookie('accessToken');

  logger.info('User logged out successfully', {
    userId: req.user.id,
    email: req.user.email,
    requestId: req.requestId
  });

  return httpResponse(req, res, 200, responseMessage.custom('Logout successful'));
});

const getMe = asyncHandler(async (req, res) => {
  return httpResponse(req, res, 200, responseMessage.custom('User fetched successfully'), {
    id: req.user.id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
    isActive: req.user.isActive
  });
});

const getMyActivities = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, type } = req.query;

  const where = { userId: req.user.id };
  if (type) {
    where.type = type;
  }

  const [activities, total] = await Promise.all([
    prisma.userActivity.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: parseInt(limit, 10),
      skip: (parseInt(page, 10) - 1) * parseInt(limit, 10),
      select: {
        id: true,
        type: true,
        ipAddress: true,
        userAgent: true,
        timestamp: true
      }
    }),
    prisma.userActivity.count({ where })
  ]);

  return httpResponse(req, res, 200, responseMessage.custom('Activities fetched successfully'), {
    activities,
    pagination: {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      total,
      totalPages: Math.ceil(total / parseInt(limit, 10))
    }
  });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    return httpError(req, res, new Error('User not found'), 404);
  }

  const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
  const hashedTempPassword = await hashPassword(tempPassword);
  const tempPasswordExpiry = new Date(Date.now() + (30 * 60 * 1000));

  await prisma.user.update({
    where: { id: user.id },
    data: {
      tempPassword: hashedTempPassword,
      tempPasswordExpiry
    }
  });

  await sendEmail({
    to: user.email,
    subject: 'Password Reset - Workbench',
    html: forgotPasswordTemplate(user.name, tempPassword, '30 minutes')
  });

  logger.info('Temporary password generated', {
    userId: user.id,
    email: user.email,
    expiresAt: tempPasswordExpiry,
    requestId: req.requestId
  });

  return httpResponse(req, res, 200, responseMessage.custom('Temporary password sent to your email'));
});

const resetPassword = asyncHandler(async (req, res) => {
  const { email, tempPassword, newPassword } = req.body;

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      tempPassword: true,
      tempPasswordExpiry: true
    }
  });

  if (!user) {
    return httpError(req, res, new Error('User not found'), 404);
  }

  if (!user.tempPassword || !user.tempPasswordExpiry) {
    return httpError(req, res, new Error('No temporary password found. Please request a new one'), 400);
  }

  if (new Date() > user.tempPasswordExpiry) {
    return httpError(req, res, new Error('Temporary password has expired. Please request a new one'), 400);
  }

  const isTempPasswordValid = await comparePassword(tempPassword, user.tempPassword);
  if (!isTempPasswordValid) {
    return httpError(req, res, new Error('Invalid temporary password'), 401);
  }

  const hashedNewPassword = await hashPassword(newPassword);

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedNewPassword,
      tempPassword: null,
      tempPasswordExpiry: null
    },
    select: {
      id: true,
      name: true,
      email: true
    }
  });

  await sendEmail({
    to: updatedUser.email,
    subject: 'Password Reset Successful - Workbench',
    html: passwordResetSuccessTemplate(updatedUser.name)
  });

  logger.info('Password reset successful', {
    userId: user.id,
    email: user.email,
    requestId: req.requestId
  });

  return httpResponse(req, res, 200, responseMessage.custom('Password reset successful'));
});

export {
  health,
  register,
  login,
  logout,
  getMe,
  getMyActivities,
  forgotPassword,
  resetPassword
};
