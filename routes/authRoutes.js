import express from "express";
import { body } from "express-validator";
import { registerAdmin, loginAdmin, logoutAdmin, getAdminProfile } from "../controllers/authController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { authLimiter } from "../middleware/rateLimiter.js";
import { validate } from "../middleware/validationMiddleware.js";

const router = express.Router();

const registerValidation = [
  body('username').trim().isLength({ min: 3, max: 30 }).matches(/^[a-zA-Z0-9_-]+$/).withMessage('Invalid username format.'),
  body('email').trim().isEmail().isLength({ max: 100 }).withMessage('Valid email address is required.'),
  body('password').isLength({ min: 8, max: 100 }).withMessage('Password must be between 8 and 100 characters.'),
  body('role').optional().isIn(['admin', 'superadmin']).withMessage('Invalid role.'),
];

const loginValidation = [
  body('usernameOrEmail').trim().notEmpty().withMessage('Username/Email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

router.post("/register", protect, authorize("superadmin"), registerValidation, validate, registerAdmin);
router.post("/login", authLimiter, loginValidation, validate, loginAdmin); // Note: Server already applies a broader authLimiter to the entire router, but keeping it explicit here is good practice or if we want specific limits. I'll use authLimiter here just to be safe.
router.post("/logout", protect, logoutAdmin);
router.get("/profile", protect, getAdminProfile);

export default router;
