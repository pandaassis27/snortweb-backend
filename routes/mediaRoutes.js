import express from "express";
import { upload } from "../middleware/mediaMiddleware.js";
import { uploadMedia, deleteMedia } from "../controllers/mediaController.js";
import { getMany } from "../controllers/crudController.js";
import Media from "../models/Media.js";
import { protect, admin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.route("/")
  .get(protect, admin, getMany(Media))
  .post(protect, admin, upload.array("files", 10), uploadMedia);

router.route("/:id")
  .delete(protect, admin, deleteMedia);

export default router;
