import express from "express";
import { 
  handleAiChat, 
  getHistory, 
  getConversations, 
  deleteConversation, 
  exportConversation, 
  getAnalytics 
} from "../controllers/aiChatController.js";
import { chatLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

// Existing chat endpoint
router.post("/", chatLimiter, handleAiChat);

// Memory & Management Endpoints
router.get("/history/:conversationId", getHistory);
router.get("/conversations", getConversations);
router.delete("/history/:conversationId", deleteConversation);
router.get("/export/:conversationId", exportConversation);
router.get("/analytics", getAnalytics);

export default router;
