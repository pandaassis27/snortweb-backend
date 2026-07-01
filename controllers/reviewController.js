import Review from "../models/Review.js";
import { readData, writeData } from "../config/localDb.js";

const FILE_NAME = "reviews.json";

// Safe ID validation
const isValidId = (id) => {
  if (process.env.USE_MOCK_DB === "true") {
    return /^[a-zA-Z0-9-]+$/.test(id);
  }
  return /^[0-9a-fA-F]{24}$/.test(id);
};

// @desc    Get all reviews
// @route   GET /api/reviews
// @access  Public
const getReviews = async (req, res) => {
  if (process.env.USE_MOCK_DB === "true") {
    const mockReviews = readData(FILE_NAME);
    return res.json(mockReviews);
  }

  try {
    const reviews = await Review.find({}).sort({ createdAt: -1 });
    return res.json(reviews);
  } catch (error) {
    return res.status(500).json({ error: "An error occurred while fetching reviews." });
  }
};

// @desc    Get single review by ID
// @route   GET /api/reviews/:id
// @access  Public
const getReviewById = async (req, res) => {
  const { id } = req.params;

  if (!isValidId(id)) {
    return res.status(400).json({ error: "Invalid review ID format." });
  }

  if (process.env.USE_MOCK_DB === "true") {
    const mockReviews = readData(FILE_NAME);
    const review = mockReviews.find((r) => r._id === id);
    if (review) {
      return res.json(review);
    }
    return res.status(404).json({ error: "Review not found" });
  }

  try {
    const review = await Review.findById(id);
    if (review) {
      return res.json(review);
    } else {
      return res.status(404).json({ error: "Review not found" });
    }
  } catch (error) {
    return res.status(500).json({ error: "An error occurred while fetching the review." });
  }
};

// @desc    Create a review
// @route   POST /api/reviews
// @access  Private (Admin Only)
const createReview = async (req, res) => {
  const { clientName, clientCompany, clientDesignation, rating, comment, approved } = req.body;

  if (!clientName || rating === undefined || !comment) {
    return res.status(400).json({ error: "Client name, rating, and comment are required" });
  }

  // Type and length validation
  const cleanName = String(clientName).trim();
  const cleanCompany = clientCompany ? String(clientCompany).trim() : "";
  const cleanDesignation = clientDesignation ? String(clientDesignation).trim() : "";
  const cleanComment = String(comment).trim();
  const numRating = Number(rating);

  if (cleanName.length < 2 || cleanName.length > 50) {
    return res.status(400).json({ error: "Client name must be between 2 and 50 characters." });
  }

  if (cleanCompany.length > 100 || cleanDesignation.length > 100) {
    return res.status(400).json({ error: "Company name and designation must not exceed 100 characters." });
  }

  if (isNaN(numRating) || numRating < 1 || numRating > 5) {
    return res.status(400).json({ error: "Rating must be an integer between 1 and 5." });
  }

  if (cleanComment.length < 10 || cleanComment.length > 1000) {
    return res.status(400).json({ error: "Comment must be between 10 and 1000 characters." });
  }

  const isApproved = approved !== undefined ? Boolean(approved) : true;

  if (process.env.USE_MOCK_DB === "true") {
    const mockReviews = readData(FILE_NAME);
    const newReview = {
      _id: `mock-review-${Date.now()}`,
      clientName: cleanName,
      clientCompany: cleanCompany,
      clientDesignation: cleanDesignation,
      rating: numRating,
      comment: cleanComment,
      approved: isApproved,
      createdAt: new Date().toISOString()
    };
    mockReviews.unshift(newReview);
    writeData(FILE_NAME, mockReviews);
    return res.status(201).json(newReview);
  }

  try {
    const review = new Review({
      clientName: cleanName,
      clientCompany: cleanCompany,
      clientDesignation: cleanDesignation,
      rating: numRating,
      comment: cleanComment,
      approved: isApproved,
    });

    const createdReview = await review.save();
    return res.status(201).json(createdReview);
  } catch (error) {
    return res.status(500).json({ error: "An error occurred while creating the review." });
  }
};

// @desc    Update a review
// @route   PUT /api/reviews/:id
// @access  Private (Admin Only)
const updateReview = async (req, res) => {
  const { id } = req.params;
  const { clientName, clientCompany, clientDesignation, rating, comment, approved } = req.body;

  if (!isValidId(id)) {
    return res.status(400).json({ error: "Invalid review ID format." });
  }

  // Type and validation checks on variables if provided
  if (clientName !== undefined && (String(clientName).trim().length < 2 || String(clientName).trim().length > 50)) {
    return res.status(400).json({ error: "Client name must be between 2 and 50 characters." });
  }

  if (rating !== undefined) {
    const numRating = Number(rating);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({ error: "Rating must be an integer between 1 and 5." });
    }
  }

  if (comment !== undefined && (String(comment).trim().length < 10 || String(comment).trim().length > 1000)) {
    return res.status(400).json({ error: "Comment must be between 10 and 1000 characters." });
  }

  if (process.env.USE_MOCK_DB === "true") {
    const mockReviews = readData(FILE_NAME);
    const review = mockReviews.find((r) => r._id === id);
    if (review) {
      review.clientName = clientName !== undefined ? String(clientName).trim() : review.clientName;
      review.clientCompany = clientCompany !== undefined ? String(clientCompany).trim() : review.clientCompany;
      review.clientDesignation = clientDesignation !== undefined ? String(clientDesignation).trim() : review.clientDesignation;
      review.rating = rating !== undefined ? Number(rating) : review.rating;
      review.comment = comment !== undefined ? String(comment).trim() : review.comment;
      review.approved = approved !== undefined ? Boolean(approved) : review.approved;
      
      writeData(FILE_NAME, mockReviews);
      return res.json(review);
    }
    return res.status(404).json({ error: "Review not found" });
  }

  try {
    const review = await Review.findById(id);

    if (review) {
      review.clientName = clientName !== undefined ? String(clientName).trim() : review.clientName;
      review.clientCompany = clientCompany !== undefined ? String(clientCompany).trim() : review.clientCompany;
      review.clientDesignation = clientDesignation !== undefined ? String(clientDesignation).trim() : review.clientDesignation;
      review.rating = rating !== undefined ? Number(rating) : review.rating;
      review.comment = comment !== undefined ? String(comment).trim() : review.comment;
      review.approved = approved !== undefined ? Boolean(approved) : review.approved;

      const updatedReview = await review.save();
      return res.json(updatedReview);
    } else {
      return res.status(404).json({ error: "Review not found" });
    }
  } catch (error) {
    return res.status(500).json({ error: "An error occurred while updating the review." });
  }
};

// @desc    Delete a review
// @route   DELETE /api/reviews/:id
// @access  Private (Admin Only)
const deleteReview = async (req, res) => {
  const { id } = req.params;

  if (!isValidId(id)) {
    return res.status(400).json({ error: "Invalid review ID format." });
  }

  if (process.env.USE_MOCK_DB === "true") {
    const mockReviews = readData(FILE_NAME);
    const reviewIndex = mockReviews.findIndex((r) => r._id === id);
    if (reviewIndex !== -1) {
      const removedReview = mockReviews.splice(reviewIndex, 1)[0];
      writeData(FILE_NAME, mockReviews);
      return res.json({ message: "Review removed successfully", review: removedReview });
    }
    return res.status(404).json({ error: "Review not found" });
  }

  try {
    const review = await Review.findById(id);

    if (review) {
      await review.deleteOne();
      return res.json({ message: "Review removed successfully" });
    } else {
      return res.status(404).json({ error: "Review not found" });
    }
  } catch (error) {
    return res.status(500).json({ error: "An error occurred while deleting the review." });
  }
};

export {
  getReviews,
  getReviewById,
  createReview,
  updateReview,
  deleteReview,
};
