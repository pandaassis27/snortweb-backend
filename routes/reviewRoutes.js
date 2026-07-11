import express from "express";
import {
  getReviews,
  getReviewById,
  createReview,
  updateReview,
  deleteReview,
  bulkDeleteReviews,
} from "../controllers/reviewController.js";
import { protect, admin, superadmin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.route("/bulk-delete").post(protect, superadmin, bulkDeleteReviews);
router.route("/").get(getReviews).post(protect, admin, createReview);
router.route("/:id").get(getReviewById).put(protect, admin, updateReview).delete(protect, admin, deleteReview);

export default router;
