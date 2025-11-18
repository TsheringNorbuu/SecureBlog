import winston from 'winston';
import path from 'path';
import fs from 'fs';

// Ensure log directory exists
const logDir = 'logs';
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

const { combine, timestamp, printf, colorize, json, errors } = winston.format;

// ----- CUSTOM FORMATS -----

// Console format for development (pretty)
const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp, stack }) => {
    return stack
      ? `[${timestamp}] ${level}: ${message}\n${stack}`
      : `[${timestamp}] ${level}: ${message}`;
  })
);

// JSON format for production (clean logs for log aggregators)
const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

// ----- LOGGER SETUP -----

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'secure-blog-api' },
  format: process.env.NODE_ENV === 'production' ? prodFormat : devFormat,
  transports: [
    // Error log
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5 * 1024 * 1024, // 5MB rotate
      maxFiles: 5
    }),

    // Combined log
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 10 * 1024 * 1024, 
      maxFiles: 5
    })
  ]
});

// Add console logging ONLY in dev
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: devFormat
    })
  );
}

// ------ OPTIONAL: HTTP LOGGER ------
// Great for tracking incoming requests without morgan
logger.http = (msg, meta = {}) => {
  logger.log({
    level: 'http',
    message: msg,
    ...meta
  });
};

export default logger;
