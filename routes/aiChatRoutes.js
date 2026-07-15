import express from "express";
import { handleAiChat } from "../controllers/aiChatController.js";
import { chatLimiter } from "../middleware/rateLimiter.js";
// Re-using the same rate limiter or could create aiChatLimiter

const router = express.Router();

// Route is mapped to /api/ai/chat
router.post("/", chatLimiter, handleAiChat);

export default router;
