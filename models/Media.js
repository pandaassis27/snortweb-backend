import mongoose from "mongoose";

const mediaSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    url: { type: String, required: true }, // URL to access the file
    type: { type: String, enum: ["image", "video", "3d_model", "document"], required: true },
    webpUrl: { type: String }, // For optimized images
    dimensions: {
      width: { type: Number },
      height: { type: Number }
    }
  },
  { timestamps: true }
);

const Media = mongoose.model("Media", mediaSchema);
export default Media;
