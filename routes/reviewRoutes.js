import express from "express";
import {
  getReviews,
  getReviewById,
  createReview,
  updateReview,
  deleteReview,
} from "../controllers/reviewController.js";
import { protect, admin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.route("/").get(getReviews).post(protect, admin, createReview);
router.route("/:id").get(getReviewById).put(protect, admin, updateReview).delete(protect, admin, deleteReview);

export default router;
