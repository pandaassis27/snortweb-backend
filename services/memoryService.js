import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import OpenAI from "openai";
import { getSystemPrompt } from "../config/aiSystemPrompt.js";

// Rough token estimation: 1 token ~= 4 chars
const estimateTokens = (text) => Math.ceil((text || "").length / 4);

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
      role,
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
   * Builds the final messages array for OpenAI
   */
  async buildContext(conversationId, ragContextBlocks, latestUserMessage, language) {
    const conv = await Conversation.findOne({ conversationId });
    const summary = conv?.summary || "";

    // 1. System Prompt (without RAG injected directly into it, to preserve order requested)
    const baseSystemPrompt = getSystemPrompt(language, []).replace(/<CONTEXT>[\s\S]*?<\/CONTEXT>/, "").trim();
    
    const messages = [];

    messages.push({
      role: "system",
      content: baseSystemPrompt
    });

    // 2. Conversation Summary
    if (summary) {
      messages.push({
        role: "system",
        content: `Conversation Summary: ${summary}`
      });
    }

    // 3. RAG Context
    if (ragContextBlocks && ragContextBlocks.length > 0) {
      const contextString = ragContextBlocks.map(c => `[${c.category}]: ${c.content}`).join('\n');
      messages.push({
        role: "system",
        content: `<CONTEXT>\n${contextString}\n</CONTEXT>`
      });
    }

    // 4. Recent Messages (Context Pruning - last ~2000 tokens)
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
      recentMessages.unshift({
        role: m.role,
        content: m.content
      });
      currentTokens += m.tokenCount;
    }

    messages.push(...recentMessages);

    // 5. Latest User Message
    messages.push({
      role: "user",
      content: latestUserMessage
    });

    return messages;
  },

  /**
   * Generate title from first message
   */
  async generateTitle(conversationId, firstMessageContent) {
    try {
      const openai = getOpenAIClient();
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Generate a short, maximum 4-word title for this user message. No quotes." },
          { role: "user", content: firstMessageContent }
        ],
        max_tokens: 10
      });
      
      const title = response.choices[0].message.content.trim();
      
      await Conversation.findOneAndUpdate(
        { conversationId },
        { title }
      );
    } catch (err) {
      console.error("Failed to generate title:", err.message);
    }
  },

  /**
   * Intelligent Summarization based on token count
   */
  async summarizeConversationIfNeeded(conversationId) {
    try {
      const conv = await Conversation.findOne({ conversationId });
      if (!conv) return;

      // Threshold: e.g. > 4000 tokens
      const TOKEN_THRESHOLD = 4000;
      
      if (conv.totalTokens < TOKEN_THRESHOLD) return;

      // Fetch all messages
      const messages = await Message.find({ conversationId }).sort({ createdAt: 1 });
      
      const openai = getOpenAIClient();
      
      const conversationText = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n");
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are an AI assistant. Summarize the following conversation history comprehensively but concisely, keeping key facts, user preferences, and important context. If there is a previous summary, update it." },
          { role: "user", content: `Previous Summary: ${conv.summary}\n\nConversation:\n${conversationText}` }
        ],
        max_tokens: 300
      });

      const newSummary = response.choices[0].message.content.trim();
      
      conv.summary = newSummary;
      // We don't delete messages, but we reset totalTokens since the summary covers them
      // Next time summarize is triggered, it will summarize based on new messages.
      // Wait, if we keep totalTokens as is, it will trigger every time. 
      // Let's reset totalTokens to just the summary tokens + recent messages tokens, or 0.
      conv.totalTokens = estimateTokens(newSummary);
      await conv.save();

    } catch (err) {
      console.error("Failed to summarize conversation:", err.message);
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
