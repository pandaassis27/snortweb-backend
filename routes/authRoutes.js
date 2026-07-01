import express from "express";
import { registerAdmin, loginAdmin, logoutAdmin, getAdminProfile } from "../controllers/authController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", protect, authorize("superadmin"), registerAdmin);
router.post("/login", loginAdmin);
router.post("/logout", protect, logoutAdmin);
router.get("/profile", protect, getAdminProfile);

export default router;
