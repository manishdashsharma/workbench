import winston from 'winston';
import config from '../../config/index.js';

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'cyan',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

const productionFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const transports = [
  new winston.transports.Console({
    format: config.env === 'production' ? productionFormat : format,
  }),
];

if (config.env === 'production') {
  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: productionFormat,
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: productionFormat,
    })
  );
}

const logger = winston.createLogger({
  level: config.logging?.level || 'info',
  levels,
  format: productionFormat,
  transports,
  exitOnError: false,
});

logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

// Add custom methods for application-specific logging
logger.startup = (message) => logger.info(`🚀 ${message}`);
logger.success = (message) => logger.info(`✅ ${message}`);
logger.security = (message, details) =>
  logger.warn(`🔒 ${message} ${details || ''}`);
logger.request = (req, statusCode, duration) => {
  const level = statusCode >= 400 ? 'warn' : 'info';
  logger[level](`${req.method} ${req.url} ${statusCode} - ${duration}ms`);
};

export default logger;
