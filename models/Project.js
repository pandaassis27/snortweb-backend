import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(

  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    tags: [{ type: String, trim: true }],
    imageUrl: { type: String, trim: true, default: "" },
    videoUrl: { type: String, trim: true, default: "" },
    glbModelUrl: { type: String, trim: true, default: "" },
    liveUrl: { type: String, trim: true, default: "" },
    githubUrl: { type: String, trim: true, default: "" },
    isLive: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
    seo: {
      metaTitle: { type: String, default: "" },
      metaDescription: { type: String, default: "" }
    }
  },
  { timestamps: true }
);
const Project = mongoose.model("Project", projectSchema);
export default Project;
