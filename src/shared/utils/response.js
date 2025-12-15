import logger from './logger.js';
import config from '../../config/index.js';
import { EApplicationEnvironment } from '../constant/application.js';

export const responseMessage = {
  ERROR: {
    SOMETHING_WENT_WRONG: 'Something went wrong',
    NOT_FOUND: 'Route not found',
    UNAUTHORIZED: 'Unauthorized access',
    FORBIDDEN: 'Access forbidden',
    BAD_REQUEST: 'Bad request',
    VALIDATION_ERROR: 'Validation failed',
    INTERNAL_SERVER_ERROR: 'Internal server error',
    SERVICE_UNAVAILABLE: 'Service unavailable',
    TIMEOUT: 'Request timeout',
    TOO_MANY_REQUESTS: 'Too many requests',
  },
  SUCCESS: {
    DEFAULT: 'Success',
    CREATED: 'Resource created successfully',
    UPDATED: 'Resource updated successfully',
    DELETED: 'Resource deleted successfully',
    FETCHED: 'Resource fetched successfully',
    HEALTH_CHECK: 'Health check passed successfully',
    READY: 'Application is ready',
    ALIVE: 'Application is alive',
    OK: 'OK',
  },
  DATABASE: {
    HEALTH_CHECK: 'Database health check completed',
    DETAILED_HEALTH_CHECK: 'Detailed health check completed',
  },
  custom: (message) => message,
};

export const httpResponse = (
  req,
  res,
  responseStatusCode,
  responseMessage,
  data = null
) => {
  const response = {
    success: true,
    statusCode: responseStatusCode,
    request: {
      ip: req.ip || null,
      method: req.method,
      url: req.originalUrl,
    },
    message: responseMessage,
    data,
  };

  logger.info('CONTROLLER_RESPONSE', {
    meta: response,
  });

  if (config.env === EApplicationEnvironment.PRODUCTION) {
    delete response.request.ip;
  }

  res.status(responseStatusCode).json(response);
};

export const errorObject = (err, req, errorStatusCode = 500) => {
  const errorData = null;
  const trace = err instanceof Error ? { error: err.stack } : null;

  const errorObj = {
    success: false,
    statusCode: errorStatusCode,
    request: {
      ip: req.ip || null,
      method: req.method,
      url: req.originalUrl,
    },
    message:
      err instanceof Error
        ? err.message || responseMessage.ERROR.SOMETHING_WENT_WRONG
        : responseMessage.ERROR.SOMETHING_WENT_WRONG,
    data: errorData,
    trace,
  };

  if (config.env === EApplicationEnvironment.PRODUCTION) {
    delete errorObj.request.ip;
  }

  return errorObj;
};

export const httpError = (req, res, err, errorStatusCode = 500) => {
  const errorObj = errorObject(err, req, errorStatusCode);

  logger.error('CONTROLLER_ERROR', {
    meta: errorObj,
  });

  return res.status(errorStatusCode).json(errorObj);
};

export const errorHandler = (nextFunc, err, req, errorStatusCode = 500) => {
  const errorObj = errorObject(err, req, errorStatusCode);
  return nextFunc(errorObj);
};

export default httpResponse;
