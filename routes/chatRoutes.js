import express from "express";
import { body } from "express-validator";
import { handleChat } from "../controllers/chatController.js";
import { chatLimiter } from "../middleware/rateLimiter.js";
import { validate } from "../middleware/validationMiddleware.js";

const router = express.Router();

const chatValidation = [
  body('message').trim().notEmpty().withMessage('Message is required').isLength({ max: 1000 }).withMessage('Message is too long. Limit is 1000 characters.'),
  body('language').optional().isIn(['en', 'hi', 'hinglish']).withMessage('Unsupported language parameter.'),
];

router.post("/", chatLimiter, chatValidation, validate, handleChat);

export default router;
