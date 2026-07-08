import multer from "multer";
import path from "path";
import crypto from "crypto";
import fs from "fs";

// Create upload dir if not exists
const uploadDir = path.join(process.cwd(), "public", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Set storage engine
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const hash = crypto.randomBytes(8).toString("hex");
    cb(null, `${Date.now()}-${hash}${ext}`);
  }
});

// Check file type
function checkFileType(file, cb) {
  // Allowed ext
  const filetypes = /jpeg|jpg|png|gif|webp|svg|glb|gltf|pdf|mp4/;
  // Check ext
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  // Check mime
  const mimetype = filetypes.test(file.mimetype) || file.mimetype.includes('model/gltf-binary') || file.mimetype.includes('model/gltf+json');

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error("Error: Images, GLB/GLTF 3D Models, and PDFs Only!"));
  }
}

// Init upload
export const upload = multer({
  storage,
  limits: { fileSize: 50000000 }, // 50MB limit for 3D models and videos
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  }
});
