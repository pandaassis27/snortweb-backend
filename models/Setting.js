import mongoose from "mongoose";

const socialLinkSchema = new mongoose.Schema({
  platform: { type: String, required: true, trim: true },
  url: { type: String, required: true, trim: true },
  icon: { type: String, required: true, trim: true, lowercase: true }
});

const themeSchema = new mongoose.Schema({
  primaryColor: { type: String, default: "#C8A15A" },
  secondaryColor: { type: String, default: "#1A1A1A" },
  accentColor: { type: String, default: "#E3BA6F" },
  fontFamily: { type: String, default: "Inter, sans-serif" },
  borderRadius: { type: String, default: "8px" },
  buttonStyle: { type: String, default: "solid" }, // solid, outline, ghost
  isDarkModeDefault: { type: Boolean, default: true }
});

const chatbotSchema = new mongoose.Schema({
  enabled: { type: Boolean, default: true },
  systemPrompt: { type: String, default: "You are a helpful assistant for Snortweb Technology." },
  welcomeMessage: { type: String, default: "Hello! How can I help you today?" },
  avatarUrl: { type: String, default: "" },
  primaryColor: { type: String, default: "#C8A15A" }
});

const seoSchema = new mongoose.Schema({
  metaTitle: { type: String, default: "Snortweb Technology" },
  metaDescription: { type: String, default: "Modern websites with security and performance built-in." },
  keywords: { type: String, default: "web development, cybersecurity, react, nodejs" },
  ogImage: { type: String, default: "" },
  robots: { type: String, default: "index, follow" },
  googleAnalyticsId: { type: String, default: "" }
});

const contactSchema = new mongoose.Schema({
  email: { type: String, default: "hello@snortweb.com" },
  phone: { type: String, default: "+1234567890" },
  whatsapp: { type: String, default: "" },
  address: { type: String, default: "" },
  googleMapsEmbedUrl: { type: String, default: "" }
});

const settingSchema = new mongoose.Schema({
  websiteName: { type: String, default: "Snortweb Technology" },
  logoUrl: { type: String, default: "" },
  faviconUrl: { type: String, default: "" },
  footerText: { type: String, default: "Building the future of the web." },
  copyrightText: { type: String, default: "© 2026 Snortweb Technology. All rights reserved." },
  
  contact: { type: contactSchema, default: () => ({}) },
  seo: { type: seoSchema, default: () => ({}) },
  theme: { type: themeSchema, default: () => ({}) },
  chatbot: { type: chatbotSchema, default: () => ({}) },
  
  socialLinks: {
    type: [socialLinkSchema],
    default: [],
  }
}, { timestamps: true });

export default mongoose.model("Setting", settingSchema);
