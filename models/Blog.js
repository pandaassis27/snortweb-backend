import mongoose from "mongoose";

const blogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },
    content: { type: String, required: true }, // HTML or Markdown
    excerpt: { type: String, trim: true },
    coverImage: { type: String, trim: true },
    author: { type: String, trim: true, default: "Admin" },
    tags: [{ type: String, trim: true }],
    isPublished: { type: Boolean, default: true },
    seo: {
      metaTitle: { type: String, default: "" },
      metaDescription: { type: String, default: "" },
      ogImage: { type: String, default: "" }
    }
  },
  { timestamps: true }
);

const Blog = mongoose.model("Blog", blogSchema);
export default Blog;
