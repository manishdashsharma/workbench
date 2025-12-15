import logger from '../utils/logger.js';
import { errorObject, responseMessage } from '../utils/response.js';

const errorHandler = (err, req, res, _next) => {
  let statusCode = 500;
  let message = responseMessage.ERROR.SOMETHING_WENT_WRONG;

  logger.error(`Error ${req.method} ${req.originalUrl}`, {
    error: err.message,
    stack: err.stack,
    requestId: req.requestId,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    body: req.body,
    params: req.params,
    query: req.query,
  });

  if (err.name === 'CastError') {
    statusCode = 404;
    message = responseMessage.ERROR.NOT_FOUND;
  } else if (err.code === 11000) {
    statusCode = 400;
    message = 'Duplicate field value entered';
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((val) => val.message)
      .join(', ');
  } else if (err.code === 'P2002') {
    statusCode = 400;
    message = 'Duplicate field value entered';
  } else if (err.code === 'P2025') {
    statusCode = 404;
    message = responseMessage.ERROR.NOT_FOUND;
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = responseMessage.ERROR.UNAUTHORIZED;
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  } else if (err.name === 'ValidationError' || err.isJoi) {
    statusCode = 400;
    message = err.details ? err.details[0].message : err.message;
  } else if (err.message === 'Too many requests') {
    statusCode = 429;
    message = responseMessage.ERROR.TOO_MANY_REQUESTS;
  } else if (err.message === 'Not allowed by CORS') {
    statusCode = 403;
    message = responseMessage.ERROR.FORBIDDEN;
  } else if (err.message) {
    message = err.message;
  }

  const errorObj = errorObject(err, req, statusCode);
  errorObj.message = message;

  return res.status(statusCode).json(errorObj);
};

const notFoundHandler = (req, res, _next) => {
  const message = `Route ${req.originalUrl} not found`;
  logger.warn(`404 - ${message}`, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    requestId: req.requestId,
  });

  const errorObj = errorObject(new Error(message), req, 404);
  return res.status(404).json(errorObj);
};

const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

const createError = (message, statusCode) => {
  return new AppError(message, statusCode);
};

export { errorHandler, notFoundHandler, asyncHandler, AppError, createError };
