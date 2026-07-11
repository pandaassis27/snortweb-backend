import express from "express";
import { upload } from "../middleware/mediaMiddleware.js";
import { getMedia, uploadMedia, deleteMedia } from "../controllers/mediaController.js";
import Media from "../models/Media.js";
import { protect, admin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.route("/")
  .get(protect, admin, getMedia)
  .post(protect, admin, upload.array("files", 10), uploadMedia);

router.route("/:id")
  .delete(protect, admin, deleteMedia);

export default router;
