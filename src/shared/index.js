// Constants
export { EApplicationEnvironment } from './constant/application.js';

// Middleware
export {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  AppError,
  createError,
} from './middleware/errorHandler.js';

export {
  authenticate,
  optionalAuth,
} from './middleware/authenication.js';

export {
  requireRole,
  requireManager,
  requireEmployee,
  requireOwnership,
  requireProjectMember,
  requireTaskAccess,
} from './middleware/authorization.js';

// Utils
export { default as logger } from './utils/logger.js';
export {
  httpResponse,
  httpError,
  errorObject,
  responseMessage,
} from './utils/response.js';

// Auth Services
export {
  generateTokens,
  verifyAccessToken,
  verifyRefreshToken,
  setCookieOptions,
} from './services/auth/jwt.js';

export {
  hashPassword,
  comparePassword,
} from './services/auth/password.js';

export {
  validateRequest
} from './middleware/validation.js';

export {
  forgotPasswordTemplate,
  passwordResetSuccessTemplate
} from './services/email/forgot-password.email.js';
