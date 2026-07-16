import { searchKnowledge } from '../services/retrievalService.js';

const fallbackReplies = {
  en: "Sorry, I don't have information about that yet. Please contact Snortweb Technology for more details.",
  hi: "Sorry, I don't have information about that yet. Please contact Snortweb Technology for more details.",
  hinglish: "Sorry, I don't have information about that yet. Please contact Snortweb Technology for more details."
};

export const handleChat = async (req, res) => {
  const { message, language } = req.body;
  const currentLang = language === "hi" ? "hi" : "en";

  if (!message || String(message).trim() === "") {
    return res.status(400).json({ error: "Message is required" });
  }

  const cleanMessage = String(message).trim();

  // Validate input constraints to prevent DoS/Overflows
  if (cleanMessage.length > 1000) {
    return res.status(400).json({ error: "Message is too long. Limit is 1000 characters." });
  }

  if (language !== undefined && language !== "en" && language !== "hi") {
    return res.status(400).json({ error: "Unsupported language parameter." });
  }

  // Language Detection
  const lowercaseMsg = cleanMessage.toLowerCase();
  let detectedLang = currentLang;
  if (/[\u0900-\u097F]/.test(cleanMessage)) {
    detectedLang = "hi";
  } else if (/\b(kya|kaise|hoon|hai|kar|aap|hain|karti|sakte|tum|hum|mujhe|toh)\b/i.test(lowercaseMsg)) {
    detectedLang = "hinglish";
  } else {
    detectedLang = "en";
  }

  // Retrieve answers purely from local knowledge base
  const results = await searchKnowledge(cleanMessage);

  if (results && results.length > 0) {
    return res.json({ reply: results[0].content });
  }

  // Exact requested fallback
  const reply = "Sorry, I don't have information about that yet. Please contact Snortweb Technology for more details.";
  
  return res.json({ reply });
};
