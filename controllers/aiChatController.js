import OpenAI from 'openai';
import { getSystemPrompt } from '../config/aiSystemPrompt.js';
import { searchKnowledge } from '../services/retrievalService.js';
import { memoryService } from '../services/memoryService.js';
import Conversation from '../models/Conversation.js';

let openaiInstance = null;
const getOpenAIClient = () => {
  if (!openaiInstance) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured.");
    }
    openaiInstance = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 15000, 
      maxRetries: 2, 
    });
  }
  return openaiInstance;
};

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
      memoryService.generateTitle(conversationId, latestUserMessage).catch(console.error);
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

    // Build context using the Context Builder
    const finalMessages = await memoryService.buildContext(
      conversationId,
      retrievedContextBlocks,
      latestUserMessage,
      language
    );

    const modelConfig = {
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini'
    };
    if (process.env.OPENAI_MODEL === 'gpt-5.5') {
       modelConfig.model = 'gpt-5.5-turbo'; 
    }

    const openai = getOpenAIClient();
    const stream = await openai.chat.completions.create({
      model: modelConfig.model,
      messages: finalMessages,
      stream: true,
      temperature: 0.3,
      max_tokens: 500,
    });

    let fullBotResponse = "";

    // Stream to client
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        fullBotResponse += content;
        res.write(`data: ${JSON.stringify({ text: content })}\n\n`);
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();

    // After streaming completes, save bot response and trigger summarization check
    if (fullBotResponse) {
      await memoryService.saveMessage(conversationId, "assistant", fullBotResponse);
      memoryService.summarizeConversationIfNeeded(conversationId).catch(console.error);
    }

  } catch (error) {
    console.error("[AI CHAT ERROR]", error.message);
    
    let errorMsg = "Sorry, I am having trouble connecting to the AI server. Please try again later.";
    if (error.status === 429) {
      errorMsg = "We are currently receiving too many requests. Please try again in a moment.";
    } else if (error.status === 401) {
      errorMsg = "AI Service configuration error.";
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
    console.error("[GET HISTORY ERROR]", error);
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
    console.error("[GET CONVERSATIONS ERROR]", error);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
};

export const deleteConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    await memoryService.deleteConversation(conversationId);
    res.json({ success: true, message: "Conversation deleted" });
  } catch (error) {
    console.error("[DELETE CONVERSATION ERROR]", error);
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
    console.error("[EXPORT CONVERSATION ERROR]", error);
    res.status(500).json({ error: "Failed to export conversation" });
  }
};

export const getAnalytics = async (req, res) => {
  try {
    const totalConversations = await Conversation.countDocuments();
    
    // Aggregations for averages
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
    console.error("[GET ANALYTICS ERROR]", error);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
};
