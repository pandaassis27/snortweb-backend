import multer from "multer";
import path from "path";
import crypto from "crypto";
import fs from "fs";

// Create upload dir
const uploadDir = path.join(process.cwd(), "public", "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Allowed extensions
const allowedExtensions = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".pdf",
  ".mp4",
  ".glb",
  ".gltf",
];

// Allowed MIME Types
const allowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "video/mp4",
  "model/gltf-binary",
  "model/gltf+json",
];

// Storage
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadDir);
  },

  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();

    cb(
      null,
      `${Date.now()}-${crypto.randomBytes(16).toString("hex")}${ext}`
    );
  },
});

// Secure file filter
function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();

  if (!allowedExtensions.includes(ext)) {
    return cb(new Error("File extension is not allowed."));
  }

  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error("File type is not allowed."));
  }

  cb(null, true);
}

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024,
    files: 10,
  },
});
