import { searchKnowledge } from '../services/retrievalService.js';

export const handleChat = async (req, res) => {
  const { message, language } = req.body;

  if (!message || String(message).trim() === "") {
    return res.status(400).json({ error: "Message is required" });
  }

  const cleanMessage = String(message).trim();

  if (cleanMessage.length > 1000) {
    return res.status(400).json({ error: "Message is too long. Limit is 1000 characters." });
  }

  const lowercaseMsg = cleanMessage.toLowerCase();

  // Smart Pricing Rule
  const pricingKeywords = ["price", "pricing", "budget", "quotation", "kitna", "kitne", "fees", "charges", "cost", "rate"];
  if (pricingKeywords.some(keyword => lowercaseMsg.includes(keyword))) {
    return res.json({
      text: "Pricing depends on project requirements, features, complexity, timeline and security requirements.\n\nPlease contact our Snortweb Solutions Team for a free consultation and detailed quotation.\n\nContact Us:\nhttps://snortwebtechnology.com/contact",
      actions: [{ label: "Contact Us", url: "https://snortwebtechnology.com/contact" }],
      relatedQuestions: ["What services do you offer?", "How long does it take?", "Do you provide hosting?"]
    });
  }

  const results = await searchKnowledge(cleanMessage);

  if (results && results.length > 0) {
    // Return the full rich payload of the top result
    const topResult = results[0];
    return res.json({
      text: topResult.content,
      title: topResult.title,
      icon: topResult.icon,
      list: topResult.list,
      details: topResult.details,
      actions: topResult.actions,
      relatedQuestions: topResult.relatedQuestions
    });
  }

  // Unknown Question Rule
  return res.json({ 
    text: "I don't have verified information about this yet.\n\nOur Snortweb Solutions Team can help you with accurate information.\n\nPlease contact us here\nhttps://snortwebtechnology.com/contact\n\nWe'll understand your requirements and get back to you with the correct information.",
    actions: [{ label: "Contact Us", url: "https://snortwebtechnology.com/contact" }]
  });
};
