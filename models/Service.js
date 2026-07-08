import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    icon: { type: String, trim: true }, // e.g., Lucide icon name or SVG path
    imageUrl: { type: String, trim: true },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

const Service = mongoose.model("Service", serviceSchema);
export default Service;
