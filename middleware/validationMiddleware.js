import { validationResult } from 'express-validator';
import logger from '../config/logger.js';

// Middleware to format and send validation errors
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const extractedErrors = [];
    errors.array().map(err => extractedErrors.push({ [err.path]: err.msg }));
    
    logger.warn(`Validation Error on ${req.method} ${req.originalUrl}`, { errors: extractedErrors });
    
    return res.status(400).json({
      error: "Validation Failed",
      details: extractedErrors,
    });
  }
  next();
};
