import mongoose from "mongoose";

const sectionSchema = new mongoose.Schema({
  sectionId: { type: String, required: true }, // e.g., "hero", "about", "faq"
  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
  
  // Dynamic fields
  title: { type: String },
  subtitle: { type: String },
  description: { type: String },
  content: { type: String }, // HTML or Markdown
  
  // Media
  images: [{ type: String }], // Array of media URLs
  videos: [{ type: String }],
  glbModelUrl: { type: String },
  
  // Custom JSON for complex data (e.g., timeline array, stats array)
  customData: { type: mongoose.Schema.Types.Mixed, default: {} },
  
  // Background config
  backgroundType: { type: String, enum: ["color", "gradient", "image", "video", "particles", "threejs"], default: "color" },
  backgroundColor: { type: String },
  backgroundMediaUrl: { type: String },
  
  // 3D Config
  threeConfig: {
    rotationSpeed: { type: Number, default: 0.01 },
    autoRotate: { type: Boolean, default: true },
    scale: { type: Number, default: 1 },
    enableBloom: { type: Boolean, default: false },
    enableParticles: { type: Boolean, default: false }
  }
});

const pageContentSchema = new mongoose.Schema(
  {
    pageName: { type: String, required: true, unique: true }, // e.g., "home", "portfolio"
    sections: [sectionSchema]
  },
  { timestamps: true }
);

const PageContent = mongoose.model("PageContent", pageContentSchema);
export default PageContent;
