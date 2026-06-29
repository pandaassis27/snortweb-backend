import express from "express";
import { registerAdmin, loginAdmin, logoutAdmin, getAdminProfile } from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", registerAdmin);
router.post("/login", loginAdmin);
router.post("/logout", protect, logoutAdmin);
router.get("/profile", protect, getAdminProfile);

export default router;
