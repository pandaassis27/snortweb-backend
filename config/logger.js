import winston from 'winston';
import 'winston-daily-rotate-file';

// Redaction filter for sensitive fields
const redactSensitiveData = winston.format((info) => {
  const sensitiveKeys = ['password', 'token', 'authorization', 'newpassword', 'cookie'];
  const redact = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;
    const newObj = Array.isArray(obj) ? [] : {};
    for (const key in obj) {
      if (sensitiveKeys.includes(key.toLowerCase())) {
        newObj[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object') {
        newObj[key] = redact(obj[key]);
      } else {
        newObj[key] = obj[key];
      }
    }
    return newObj;
  };

  // Often winston places additional metadata in info.meta or directly on info
  for (const key in info) {
    if (key !== 'level' && key !== 'message' && key !== 'timestamp' && key !== 'splat') {
        if (sensitiveKeys.includes(key.toLowerCase())) {
            info[key] = '[REDACTED]';
        } else if (typeof info[key] === 'object') {
            info[key] = redact(info[key]);
        }
    }
  }
  return info;
});

// Define log format
const logFormat = winston.format.combine(
  redactSensitiveData(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Transports
const transports = [];

// File transport for all logs (rotating daily)
transports.push(
  new winston.transports.DailyRotateFile({
    filename: 'logs/application-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    level: 'info',
  })
);

// File transport for error logs (rotating daily)
transports.push(
  new winston.transports.DailyRotateFile({
    filename: 'logs/error-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '30d',
    level: 'error',
  })
);

// Console transport
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(
          (info) => `${info.timestamp} ${info.level}: ${info.message}`
        )
      ),
    })
  );
} else {
  // In production, log to console in JSON format for easy parsing by log aggregators
  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  );
}

// Create the logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  format: logFormat,
  transports,
  exitOnError: false, // Do not exit on handled exceptions
});

export default logger;
