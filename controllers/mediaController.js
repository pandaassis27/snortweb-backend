import fs from "fs";
import path from "path";
import sharp from "sharp";
import Media from "../models/Media.js";

export const uploadMedia = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    const uploadedMedia = [];

    for (const file of req.files) {
      const isImage = file.mimetype.startsWith("image/");
      const isSvg = file.mimetype === "image/svg+xml";
      let webpUrl = null;
      let width = null;
      let height = null;

      // Handle image compression and WebP conversion (skip SVG)
      if (isImage && !isSvg) {
        const ext = path.extname(file.originalname);
        const webpFilename = file.filename.replace(ext, ".webp");
        const webpPath = path.join(file.destination, webpFilename);

        // Convert to webp and extract metadata
        const metadata = await sharp(file.path)
          .webp({ quality: 80 })
          .toFile(webpPath)
          .then(() => sharp(file.path).metadata());

        webpUrl = `/uploads/${webpFilename}`;
        width = metadata.width;
        height = metadata.height;
      }

      let type = "document";
      if (isImage) type = "image";
      else if (file.mimetype.includes("video")) type = "video";
      else if (file.originalname.endsWith(".glb") || file.originalname.endsWith(".gltf")) type = "3d_model";

      const mediaEntry = await Media.create({
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        url: `/uploads/${file.filename}`,
        type,
        webpUrl,
        dimensions: (width && height) ? { width, height } : undefined
      });

      uploadedMedia.push(mediaEntry);
    }

    res.status(201).json(uploadedMedia);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const deleteMedia = async (req, res) => {
  try {
    const media = await Media.findById(req.params.id);
    if (!media) return res.status(404).json({ message: "Media not found" });

    // Delete files from disk
    const originalPath = path.join(process.cwd(), "public", media.url);
    if (fs.existsSync(originalPath)) fs.unlinkSync(originalPath);

    if (media.webpUrl) {
      const webpPath = path.join(process.cwd(), "public", media.webpUrl);
      if (fs.existsSync(webpPath)) fs.unlinkSync(webpPath);
    }

    await Media.findByIdAndDelete(req.params.id);
    res.json({ message: "Media deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
