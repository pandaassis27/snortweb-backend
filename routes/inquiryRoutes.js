import express from "express";
import { body } from "express-validator";
import {
  getInquiries,
  getInquiryById,
  createInquiry,
  updateInquiryStatus,
  deleteInquiry,
} from "../controllers/inquiryController.js";
import { protect } from "../middleware/authMiddleware.js";
import { contactLimiter } from "../middleware/rateLimiter.js";
import { validate } from "../middleware/validationMiddleware.js";

const router = express.Router();

const inquiryValidation = [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters.'),
  body('email').trim().isEmail().isLength({ max: 100 }).withMessage('Valid email address is required.'),
  body('company').optional().trim().isLength({ max: 100 }).withMessage('Company name must not exceed 100 characters.'),
  body('service').trim().isLength({ min: 2, max: 100 }).withMessage('Service choice must be between 2 and 100 characters.'),
  body('budget').trim().isLength({ min: 2, max: 50 }).withMessage('Budget field must be between 2 and 50 characters.'),
  body('message').trim().isLength({ min: 10, max: 3000 }).withMessage('Message must be between 10 and 3000 characters.'),
];

router.route("/")
  .get(protect, getInquiries)
  .post(contactLimiter, inquiryValidation, validate, createInquiry);

router.route("/:id")
  .get(protect, getInquiryById)
  .put(protect, updateInquiryStatus)
  .delete(protect, deleteInquiry);

export default router;
