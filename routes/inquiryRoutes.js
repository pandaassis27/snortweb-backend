import express from "express";
import rateLimit from "express-rate-limit";
import {
  getInquiries,
  getInquiryById,
  createInquiry,
  updateInquiryStatus,
  deleteInquiry,
} from "../controllers/inquiryController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

const inquiryLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 15, // Limit to 15 inquiries per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many contact inquiries, please try again after an hour." },
});

router.route("/")
  .get(protect, getInquiries)
  .post(inquiryLimiter, createInquiry);

router.route("/:id")
  .get(protect, getInquiryById)
  .put(protect, updateInquiryStatus)
  .delete(protect, deleteInquiry);

export default router;
