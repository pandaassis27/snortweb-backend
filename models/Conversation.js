import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    conversationId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    userIdentifier: {
      type: String,
      index: true,
      default: "anonymous",
    },
    title: {
      type: String,
      default: "New Conversation",
    },
    summary: {
      type: String,
      default: "",
    },
    messageCount: {
      type: Number,
      default: 0,
    },
    totalTokens: {
      type: Number,
      default: 0,
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      index: { expires: 0 }, // TTL index
    },
  },
  { timestamps: true }
);

// Indexes requested
conversationSchema.index({ createdAt: -1 });

export default mongoose.model("Conversation", conversationSchema);
