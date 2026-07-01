import express from "express";
import { handleChat } from "../controllers/chatController.js";
import rateLimit from "express-rate-limit";

const router = express.Router();

// Rate limiting for chatbot requests (max 40 requests per 15 minutes)
const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many chat messages, please try again after 15 minutes." }
});

router.post("/", chatLimiter, handleChat);

export default router;
