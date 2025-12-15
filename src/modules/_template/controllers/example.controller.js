import { httpResponse, responseMessage, httpError, asyncHandler, logger } from '../../../shared/index.js';


const health = asyncHandler(async (req, res) => {
  return httpResponse(req, res, 200, responseMessage.custom('Example module is healthy'), {
    module: 'example',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

const exampleFunction = asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;

    logger.info('Example function called', { userId });

    return httpResponse(req, res, 200, responseMessage.SUCCESS.OK);
  } catch (error) {
    logger.error('Example function failed', {
      error: error.message,
      userId: req.user?.id,
      requestId: req.requestId,
    });

    return httpError(req, res, new Error(responseMessage.custom('Operation failed')), 500);
  }
});

export {
  health,
  exampleFunction
};
