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
  body("name")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters."),

  body("email")
    .trim()
    .isEmail()
    .withMessage("Please enter a valid email address.")
    .isLength({ max: 100 })
    .withMessage("Email must not exceed 100 characters."),

  body("company")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage("Company name must not exceed 100 characters."),

  body("service")
    .trim()
    .notEmpty()
    .withMessage("Please select a service.")
    .isLength({ min: 2, max: 100 })
    .withMessage("Service must be between 2 and 100 characters."),

  body("budget")
    .trim()
    .notEmpty()
    .withMessage("Please select a budget.")
    .isLength({ min: 2, max: 50 })
    .withMessage("Budget must be between 2 and 50 characters."),

  body("message")
    .trim()
    .notEmpty()
    .withMessage("Message is required.")
    .isLength({ min: 1, max: 3000 })
    .withMessage("Message cannot exceed 3000 characters."),
];

router
  .route("/")
  .get(protect, getInquiries)
  .post(contactLimiter, inquiryValidation, validate, createInquiry);

router
  .route("/:id")
  .get(protect, getInquiryById)
  .put(protect, updateInquiryStatus)
  .delete(protect, deleteInquiry);

export default router;