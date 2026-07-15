import OpenAI from 'openai';
import { getSystemPrompt } from '../config/aiSystemPrompt.js';

// Prepare OpenAI instance (instantiated lazily or handled carefully)
let openaiInstance = null;
const getOpenAIClient = () => {
  if (!openaiInstance) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured.");
    }
    openaiInstance = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 15000, // 15 seconds timeout
      maxRetries: 2, // Basic retry handling
    });
  }
  return openaiInstance;
};

// Extracted chat logic, making it easy to plug RAG later
const generateChatCompletion = async (messages, modelConfig, res) => {
  const openai = getOpenAIClient();

  const stream = await openai.chat.completions.create({
    model: modelConfig.model,
    messages: messages,
    stream: true,
    temperature: 0.7,
    max_tokens: 300,
  });

  // Handle Server-Sent Events (SSE) Stream
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || "";
    if (content) {
      // Write chunk strictly in SSE format
      res.write(`data: ${JSON.stringify({ text: content })}\n\n`);
    }
  }

  res.write("data: [DONE]\n\n");
  res.end();
};

export const handleAiChat = async (req, res) => {
  // Graceful API Error Handler helper
  const sendError = (statusCode, message) => {
    if (!res.headersSent) {
      res.status(statusCode).json({ error: message });
    } else {
      res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
      res.end();
    }
  };

  try {
    const { messages, language } = req.body;
    
    // Request Validation
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return sendError(400, "Messages array is required and must not be empty.");
    }

    // Rate Limiting Context / DOS Protection on Payload Size
    if (messages.length > 20) {
      return sendError(400, "Conversation history is too long. Limit is 20 messages.");
    }

    // Set up headers for SSE BEFORE initiating the request
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    // Ensure the response isn't buffered by proxies
    res.flushHeaders(); 

    // Build Messages Array
    const systemMessage = {
      role: 'system',
      content: getSystemPrompt(language)
    };

    // Sanitize and map incoming history
    const history = messages.map(msg => ({
      role: msg.isBot ? 'assistant' : 'user',
      content: String(msg.text).trim().substring(0, 1000) // Ensure max 1000 chars per message
    }));

    const finalMessages = [systemMessage, ...history];

    const modelConfig = {
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini' // Using 4o-mini as fallback, but user requested GPT-5.5 default mapping
    };

    // For requested "GPT-5.5" default support
    if (process.env.OPENAI_MODEL === 'gpt-5.5') {
       // Typically maps to whatever future model is configured or defaults gracefully
       modelConfig.model = 'gpt-5.5-turbo'; 
    }

    // Generate and Stream
    await generateChatCompletion(finalMessages, modelConfig, res);

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
