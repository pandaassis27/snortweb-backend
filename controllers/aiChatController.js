import { GoogleGenAI } from '@google/genai';
import { searchKnowledge } from '../services/retrievalService.js';
import { memoryService } from '../services/memoryService.js';
import Conversation from '../models/Conversation.js';
import logger from '../config/logger.js';

let geminiInstance = null;
const getGeminiClient = () => {
  if (!geminiInstance) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured.");
    }
    geminiInstance = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
  }
  return geminiInstance;
};

// Sleep utility for retries
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

export const handleAiChat = async (req, res) => {
  const sendError = (statusCode, message) => {
    if (!res.headersSent) {
      res.status(statusCode).json({ error: message });
    } else {
      res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
      res.end();
    }
  };

  try {
    const { messages, language, conversationId, sessionId } = req.body;
    
    // Validations
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return sendError(400, "Messages array is required and must not be empty.");
    }
    if (!conversationId || !sessionId) {
      return sendError(400, "conversationId and sessionId are required.");
    }
    if (messages.length > 50) {
      return sendError(400, "Payload too large. Please rely on backend history.");
    }

    const latestUserMessageObj = messages[messages.length - 1];
    const latestUserMessage = String(latestUserMessageObj?.text || "").trim().substring(0, 1000);

    // Initialize or fetch conversation
    const conv = await memoryService.getOrCreateConversation(conversationId, sessionId);

    // If it's the very first message, generate a title asynchronously
    if (conv.messageCount === 0) {
      memoryService.generateTitle(conversationId, latestUserMessage).catch(err => {
        logger.error("[GEMINI TITLE ERROR]", { message: err.message, name: err.name });
      });
    }

    // Save user message to memory
    await memoryService.saveMessage(conversationId, "user", latestUserMessage);

    // Setup headers for SSE
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders(); 

    // RAG Retrieval
    const retrievedContextBlocks = await searchKnowledge(latestUserMessage);

    // Build context
    const { systemInstruction, contents } = await memoryService.buildContext(
      conversationId,
      retrievedContextBlocks,
      latestUserMessage,
      language
    );

    const ai = getGeminiClient();
    let fullBotResponse = "";
    let retryCount = 0;
    const MAX_RETRIES = 1;
    let currentModel = GEMINI_MODEL;

    // Retry and timeout logic wrapper
    const generateStreamWithRetry = async () => {
      while (retryCount <= MAX_RETRIES) {
        try {
          logger.info(`[GEMINI REQUEST] Using model: ${currentModel}`);
          // Implementing request timeout wrapper via AbortController
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

          const stream = await ai.models.generateContentStream({
            model: currentModel,
            contents: contents,
            config: {
              systemInstruction: systemInstruction,
              temperature: 0.3,
              maxOutputTokens: 500
            },
            signal: controller.signal
          });

          for await (const chunk of stream) {
            clearTimeout(timeoutId); // clear timeout on first successful chunk
            const content = chunk.text || "";
            if (content) {
              fullBotResponse += content;
              res.write(`data: ${JSON.stringify({ text: content })}\n\n`);
            }
          }
          clearTimeout(timeoutId);
          return; // Success, break loop
        } catch (err) {
          if (retryCount < MAX_RETRIES) {
            // Handle 404 (Model not found) by falling back to gemini-2.0-flash
            if (err.status === 404) {
              retryCount++;
              currentModel = "gemini-2.0-flash";
              logger.warn(`[GEMINI RETRY] Model not found (404). Falling back to ${currentModel} (Attempt ${retryCount})...`);
              await sleep(1000);
              continue;
            }
            // Handle transient errors (429, 503, timeout)
            if (err.status === 429 || err.status === 503 || err.name === 'AbortError') {
              retryCount++;
              logger.warn(`[GEMINI RETRY] Transient error. Retrying request (Attempt ${retryCount})...`, { status: err.status, name: err.name });
              await sleep(1000);
              continue;
            }
          }
          throw err;
        }
      }
    };

    await generateStreamWithRetry();
    logger.info(`[GEMINI SUCCESS] Stream completed successfully with model: ${currentModel}`);

    res.write("data: [DONE]\n\n");
    res.end();

    if (fullBotResponse) {
      await memoryService.saveMessage(conversationId, "assistant", fullBotResponse);
      memoryService.summarizeConversationIfNeeded(conversationId).catch(err => {
        logger.error("[GEMINI SUMMARIZE ERROR]", { message: err.message, name: err.name });
      });
    }

  } catch (error) {
    logger.error("[AI CHAT ERROR]", { 
      message: error.message, 
      status: error.status, 
      name: error.name
    });
    
    let errorMsg = "Sorry, I am having trouble connecting to the AI server. Please try again later.";
    if (error.status === 429) {
      errorMsg = "We are currently receiving too many requests. Please try again in a moment.";
    } else if (error.status === 401 || error.status === 403) {
      errorMsg = "AI Service configuration error.";
    } else if (error.name === 'AbortError') {
      errorMsg = "The AI response timed out. Please try asking again.";
    }

    sendError(500, errorMsg);
  }
};

// ------------------------------------------------------------------
// Memory & Admin Endpoints
// ------------------------------------------------------------------

export const getHistory = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const history = await memoryService.getHistory(conversationId);
    res.json({ success: true, history });
  } catch (error) {
    logger.error("[GET HISTORY ERROR]", { message: error.message });
    res.status(500).json({ error: "Failed to fetch history" });
  }
};

export const getConversations = async (req, res) => {
  try {
    const { sessionId } = req.query;
    let query = {};
    if (sessionId) {
      query.sessionId = sessionId;
    }
    const conversations = await Conversation.find(query).sort({ updatedAt: -1 }).select("-summary");
    res.json({ success: true, conversations });
  } catch (error) {
    logger.error("[GET CONVERSATIONS ERROR]", { message: error.message });
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
};

export const deleteConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    await memoryService.deleteConversation(conversationId);
    res.json({ success: true, message: "Conversation deleted" });
  } catch (error) {
    logger.error("[DELETE CONVERSATION ERROR]", { message: error.message });
    res.status(500).json({ error: "Failed to delete conversation" });
  }
};

export const exportConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const data = await memoryService.exportConversation(conversationId);
    if (!data) return res.status(404).json({ error: "Conversation not found" });
    
    res.json({ success: true, data });
  } catch (error) {
    logger.error("[EXPORT CONVERSATION ERROR]", { message: error.message });
    res.status(500).json({ error: "Failed to export conversation" });
  }
};

export const getAnalytics = async (req, res) => {
  try {
    const totalConversations = await Conversation.countDocuments();
    const stats = await Conversation.aggregate([
      {
        $group: {
          _id: null,
          avgMessages: { $avg: "$messageCount" },
          avgTokens: { $avg: "$totalTokens" }
        }
      }
    ]);
    const activeConversations = await Conversation.countDocuments({
      lastActivity: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    res.json({
      success: true,
      analytics: {
        totalConversations,
        activeConversations,
        averageMessages: stats[0]?.avgMessages || 0,
        averageTokens: stats[0]?.avgTokens || 0
      }
    });
  } catch (error) {
    logger.error("[GET ANALYTICS ERROR]", { message: error.message });
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
};
