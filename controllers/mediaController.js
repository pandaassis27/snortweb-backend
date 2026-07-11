import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import sharp from "sharp";
import Media from "../models/Media.js";
import logger from "../config/logger.js";

// @desc    Get paginated media with search and filter
// @route   GET /api/media
// @access  Private (Admin)
export const getMedia = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.search) {
      query.originalName = { $regex: req.query.search, $options: "i" };
    }
    if (req.query.type && req.query.type !== "All") {
      query.type = req.query.type;
    }

    const total = await Media.countDocuments(query);
    const media = await Media.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      media,
      page,
      pages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    logger.error("Get Media Error: " + error.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const uploadMedia = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        message: "No files uploaded",
      });
    }

    const uploadedMedia = [];

    for (const file of req.files) {
      let webpUrl = null;
      let width = null;
      let height = null;

      const isImage =
        file.mimetype.startsWith("image/") &&
        file.mimetype !== "image/svg+xml";

      // Image optimization
      if (isImage) {
        try {
          const metadata = await sharp(file.path).metadata();

          width = metadata.width;
          height = metadata.height;

          const webpFilename =
            path.parse(file.filename).name + ".webp";

          const webpPath = path.join(
            file.destination,
            webpFilename
          );

          await sharp(file.path)
            .webp({ quality: 80 })
            .toFile(webpPath);

          webpUrl = `/uploads/${webpFilename}`;
        } catch (err) {
          await fsPromises.unlink(file.path).catch(() => { });
          return res.status(400).json({
            message: "Invalid or corrupted image uploaded.",
          });
        }
      }

      let type = "document";

      if (file.mimetype.startsWith("image/")) {
        type = "image";
      } else if (file.mimetype.startsWith("video/")) {
        type = "video";
      } else if (
        file.mimetype === "model/gltf-binary" ||
        file.mimetype === "model/gltf+json"
      ) {
        type = "3d_model";
      }

      const mediaEntry = await Media.create({
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        url: `/uploads/${file.filename}`,
        type,
        webpUrl,
        dimensions:
          width && height
            ? {
              width,
              height,
            }
            : undefined,
      });

      uploadedMedia.push(mediaEntry);
    }

    return res.status(201).json(uploadedMedia);
  } catch (error) {
    logger.error("Upload Error: " + error.message);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

export const deleteMedia = async (req, res) => {
  try {
    const media = await Media.findById(req.params.id);

    if (!media) {
      return res.status(404).json({
        message: "Media not found",
      });
    }

    const safeOriginalName = path.basename(media.url);
    const originalPath = path.join(
      process.cwd(),
      "public",
      "uploads",
      safeOriginalName
    );

    if (fs.existsSync(originalPath)) {
      await fsPromises.unlink(originalPath).catch(() => { });
    }

    if (media.webpUrl) {
      const safeWebpName = path.basename(media.webpUrl);
      const webpPath = path.join(
        process.cwd(),
        "public",
        "uploads",
        safeWebpName
      );

      if (fs.existsSync(webpPath)) {
        await fsPromises.unlink(webpPath).catch(() => { });
      }
    }

    await Media.findByIdAndDelete(req.params.id);

    return res.json({
      message: "Media deleted successfully",
    });
  } catch (error) {
    logger.error("Delete Media Error: " + error.message);

    return res.status(500).json({
      message: "Server error",
    });
  }
};
