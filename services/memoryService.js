import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import { GoogleGenAI } from "@google/genai";
import { getSystemPrompt } from "../config/aiSystemPrompt.js";

// Rough token estimation: 1 token ~= 4 chars
const estimateTokens = (text) => Math.ceil((text || "").length / 4);

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

export const memoryService = {
  /**
   * Initializes or fetches a conversation
   */
  async getOrCreateConversation(conversationId, sessionId, userIdentifier = "anonymous") {
    let conv = await Conversation.findOne({ conversationId });
    if (!conv) {
      conv = await Conversation.create({
        conversationId,
        sessionId,
        userIdentifier,
        // Set expiry for 7 days if inactive
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });
    } else {
      // Update expiry and activity
      conv.lastActivity = new Date();
      conv.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await conv.save();
    }
    return conv;
  },

  /**
   * Saves a message and updates the conversation stats
   */
  async saveMessage(conversationId, role, content, metadata = {}) {
    const tokens = estimateTokens(content);

    const msg = await Message.create({
      conversationId,
      role, // 'user' or 'assistant'
      content,
      tokenCount: tokens,
      metadata
    });

    const conv = await Conversation.findOne({ conversationId });
    if (conv) {
      conv.messageCount += 1;
      conv.totalTokens += tokens;
      conv.lastActivity = new Date();
      await conv.save();
    }

    return msg;
  },

  /**
   * Builds the final messages array for Gemini
   */
  async buildContext(conversationId, ragContextBlocks, latestUserMessage, language) {
    const conv = await Conversation.findOne({ conversationId });
    const summary = conv?.summary || "";

    // Build the systemInstruction combining System Prompt -> Summary -> RAG
    const baseSystemPrompt = getSystemPrompt(language, []).replace(/<CONTEXT>[\s\S]*?<\/CONTEXT>/, "").trim();
    
    let systemText = baseSystemPrompt;

    if (summary) {
      systemText += `\n\nConversation Summary: ${summary}`;
    }

    if (ragContextBlocks && ragContextBlocks.length > 0) {
      const contextString = ragContextBlocks.map(c => `[${c.category}]: ${c.content}`).join('\n');
      systemText += `\n\n<CONTEXT>\n${contextString}\n</CONTEXT>`;
    }

    // Recent Messages (Context Pruning - last ~2000 tokens)
    const recentMessages = [];
    let currentTokens = 0;
    const MAX_RECENT_TOKENS = 2000;

    // Fetch messages sorted by newest first
    const dbMessages = await Message.find({ conversationId })
      .sort({ createdAt: -1 })
      .limit(20);

    for (const m of dbMessages) {
      // Skip the latest user message as it will be appended last
      if (m.content === latestUserMessage && m.role === "user" && recentMessages.length === 0) {
         continue;
      }
      
      if (currentTokens + m.tokenCount > MAX_RECENT_TOKENS) {
        break;
      }
      
      // Map 'assistant' to 'model' for Gemini
      recentMessages.unshift({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      });
      currentTokens += m.tokenCount;
    }

    // Append Latest User Message
    recentMessages.push({
      role: "user",
      parts: [{ text: latestUserMessage }]
    });

    return {
      systemInstruction: { parts: [{ text: systemText }] },
      contents: recentMessages
    };
  },

  /**
   * Generate title from first message
   */
  async generateTitle(conversationId, firstMessageContent) {
    try {
      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: firstMessageContent,
        config: {
          systemInstruction: { parts: [{ text: "Generate a short, maximum 4-word title for this user message. No quotes." }] },
          maxOutputTokens: 10
        }
      });
      
      const title = response.text.trim();
      
      await Conversation.findOneAndUpdate(
        { conversationId },
        { title }
      );
    } catch (err) {
      console.error("[GEMINI] Failed to generate title:", err.message);
    }
  },

  /**
   * Intelligent Summarization based on token count
   */
  async summarizeConversationIfNeeded(conversationId) {
    try {
      const conv = await Conversation.findOne({ conversationId });
      if (!conv) return;

      const TOKEN_THRESHOLD = 4000;
      if (conv.totalTokens < TOKEN_THRESHOLD) return;

      const messages = await Message.find({ conversationId }).sort({ createdAt: 1 });
      const conversationText = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n");
      
      const ai = getGeminiClient();
      
      const prompt = `Previous Summary: ${conv.summary}\n\nConversation:\n${conversationText}`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          systemInstruction: { parts: [{ text: "You are an AI assistant. Summarize the following conversation history comprehensively but concisely, keeping key facts, user preferences, and important context. If there is a previous summary, update it." }] },
          maxOutputTokens: 300
        }
      });

      const newSummary = response.text.trim();
      
      conv.summary = newSummary;
      conv.totalTokens = estimateTokens(newSummary);
      await conv.save();

    } catch (err) {
      console.error("[GEMINI] Failed to summarize conversation:", err.message);
    }
  },

  /**
   * Get complete history
   */
  async getHistory(conversationId) {
    return Message.find({ conversationId }).sort({ createdAt: 1 });
  },

  /**
   * Delete conversation and messages
   */
  async deleteConversation(conversationId) {
    await Conversation.deleteOne({ conversationId });
    await Message.deleteMany({ conversationId });
  },

  /**
   * Export conversation in JSON
   */
  async exportConversation(conversationId) {
    const conv = await Conversation.findOne({ conversationId }).lean();
    if (!conv) return null;
    
    const messages = await Message.find({ conversationId }).sort({ createdAt: 1 }).lean();
    
    return {
      conversation: conv,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
        createdAt: m.createdAt
      }))
    };
  }
};
