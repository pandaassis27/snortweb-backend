import mongoose from "mongoose";

const socialLinkSchema = new mongoose.Schema({
  platform: {
    type: String,
    required: [true, "Platform name is required (e.g., LinkedIn)"],
    trim: true,
  },
  url: {
    type: String,
    required: [true, "URL is required"],
    trim: true,
  },
  icon: {
    type: String,
    required: [true, "Icon name is required (e.g., linkedin, twitter, instagram, github)"],
    trim: true,
    lowercase: true,
  }
});

const settingSchema = new mongoose.Schema({
  socialLinks: {
    type: [socialLinkSchema],
    default: [],
  },
  // Future settings can go here (e.g. contact email, phone)
}, { timestamps: true });

export default mongoose.model("Setting", settingSchema);
