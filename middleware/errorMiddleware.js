import logger from '../config/logger.js';

export const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

export const errorHandler = (err, req, res, next) => {
  // Determine status code
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message;

  // Check for Mongoose bad ObjectId
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    statusCode = 404;
    message = 'Resource not found';
  }

  // Check for Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map((val) => val.message).join(', ');
  }

  // Check for invalid JSON body
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = 400;
    message = 'Invalid JSON input.';
  }

  // Log error
  if (statusCode >= 500) {
    logger.error(`[500 ERROR] ${req.method} ${req.originalUrl}: ${err.message}`, { 
      stack: err.stack,
      ip: req.ip
    });
  } else {
    logger.warn(`[${statusCode} ERROR] ${req.method} ${req.originalUrl}: ${message}`);
  }

  // Send response
  res.status(statusCode).json({
    error: message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : null,
  });
};
