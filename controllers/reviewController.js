import Review from "../models/Review.js";

// In-Memory mock storage for reviews
const mockReviews = [
  {
    _id: "mock-review-1",
    clientName: "David Vance",
    clientCompany: "Apex Security Inc.",
    clientDesignation: "Director of Architecture",
    rating: 5,
    comment: "The Snortweb method is unmatched. They built our customer portal with built-in penetration logging and zero security vulnerabilities. Highly recommended.",
    approved: true,
    createdAt: new Date().toISOString()
  },
  {
    _id: "mock-review-2",
    clientName: "Sofia Alvarez",
    clientCompany: "Vertex FinTech",
    clientDesignation: "VP of Engineering",
    rating: 5,
    comment: "Outstanding responsive support, clean and fast React rendering. The site compiles to very lightweight bundles and has passed all our automated auditing checks.",
    approved: true,
    createdAt: new Date(Date.now() - 172800000).toISOString()
  }
];

// @desc    Get all reviews
// @route   GET /api/reviews
// @access  Public
const getReviews = async (req, res) => {
  if (process.env.USE_MOCK_DB === "true") {
    return res.json(mockReviews);
  }

  try {
    const reviews = await Review.find({}).sort({ createdAt: -1 });
    return res.json(reviews);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// @desc    Get single review by ID
// @route   GET /api/reviews/:id
// @access  Public
const getReviewById = async (req, res) => {
  if (process.env.USE_MOCK_DB === "true") {
    const review = mockReviews.find((r) => r._id === req.params.id);
    if (review) {
      return res.json(review);
    }
    return res.status(404).json({ error: "Review not found" });
  }

  try {
    const review = await Review.findById(req.params.id);
    if (review) {
      return res.json(review);
    } else {
      return res.status(404).json({ error: "Review not found" });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// @desc    Create a review
// @route   POST /api/reviews
// @access  Private (Admin Only)
const createReview = async (req, res) => {
  const { clientName, clientCompany, clientDesignation, rating, comment, approved } = req.body;

  if (!clientName || !rating || !comment) {
    return res.status(400).json({ error: "Client name, rating, and comment are required" });
  }

  if (process.env.USE_MOCK_DB === "true") {
    const newReview = {
      _id: `mock-review-${Date.now()}`,
      clientName,
      clientCompany: clientCompany || "",
      clientDesignation: clientDesignation || "",
      rating: Number(rating),
      comment,
      approved: approved !== undefined ? approved : true,
      createdAt: new Date().toISOString()
    };
    mockReviews.unshift(newReview);
    return res.status(201).json(newReview);
  }

  try {
    const review = new Review({
      clientName,
      clientCompany: clientCompany || "",
      clientDesignation: clientDesignation || "",
      rating,
      comment,
      approved: approved !== undefined ? approved : true,
    });

    const createdReview = await review.save();
    return res.status(201).json(createdReview);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// @desc    Update a review
// @route   PUT /api/reviews/:id
// @access  Private (Admin Only)
const updateReview = async (req, res) => {
  const { clientName, clientCompany, clientDesignation, rating, comment, approved } = req.body;

  if (process.env.USE_MOCK_DB === "true") {
    const review = mockReviews.find((r) => r._id === req.params.id);
    if (review) {
      review.clientName = clientName || review.clientName;
      review.clientCompany = clientCompany !== undefined ? clientCompany : review.clientCompany;
      review.clientDesignation = clientDesignation !== undefined ? clientDesignation : review.clientDesignation;
      review.rating = rating || review.rating;
      review.comment = comment || review.comment;
      review.approved = approved !== undefined ? approved : review.approved;
      return res.json(review);
    }
    return res.status(404).json({ error: "Review not found" });
  }

  try {
    const review = await Review.findById(req.params.id);

    if (review) {
      review.clientName = clientName || review.clientName;
      review.clientCompany = clientCompany !== undefined ? clientCompany : review.clientCompany;
      review.clientDesignation = clientDesignation !== undefined ? clientDesignation : review.clientDesignation;
      review.rating = rating || review.rating;
      review.comment = comment || review.comment;
      review.approved = approved !== undefined ? approved : review.approved;

      const updatedReview = await review.save();
      return res.json(updatedReview);
    } else {
      return res.status(404).json({ error: "Review not found" });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// @desc    Delete a review
// @route   DELETE /api/reviews/:id
// @access  Private (Admin Only)
const deleteReview = async (req, res) => {
  if (process.env.USE_MOCK_DB === "true") {
    const reviewIndex = mockReviews.findIndex((r) => r._id === req.params.id);
    if (reviewIndex !== -1) {
      mockReviews.splice(reviewIndex, 1);
      return res.json({ message: "Review removed successfully" });
    }
    return res.status(404).json({ error: "Review not found" });
  }

  try {
    const review = await Review.findById(req.params.id);

    if (review) {
      await review.deleteOne();
      return res.json({ message: "Review removed successfully" });
    } else {
      return res.status(404).json({ error: "Review not found" });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export {
  getReviews,
  getReviewById,
  createReview,
  updateReview,
  deleteReview,
};
