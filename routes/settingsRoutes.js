import express from "express";
import { getSettings, updateSettings } from "../controllers/settingsController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.route("/")
  .get(getSettings)
  .put(protect, updateSettings);

export default router;
