import rateLimit from "express-rate-limit";

// Utility Function
const createLimiter = (minutes, maxRequests, message) => {
  return rateLimit({
    windowMs: minutes * 60 * 1000,
    max: maxRequests,

    standardHeaders: true,
    legacyHeaders: false,

    message: {
      success: false,
      error: message,
    },

    skipSuccessfulRequests: false,
    skipFailedRequests: false,

    handler: (req, res) => {
      return res.status(429).json({
        success: false,
        error: message,
      });
    },
  });
};

// ==========================================
// Global Limiter
// ==========================================
export const globalLimiter =
  process.env.NODE_ENV === "production"
    ? createLimiter(
      15,
      500,
      "Too many requests from this IP. Please try again after 15 minutes."
    )
    : createLimiter(
      15,
      5000,
      "Development rate limit."
    );

// ==========================================
// Login/Auth Limiter (Brute Force Protection)
// ==========================================
export const authLimiter =
  process.env.NODE_ENV === "production"
    ? createLimiter(
      15,
      20,
      "Too many authentication attempts. Please try again after 15 minutes."
    )
    : createLimiter(
      15,
      500,
      "Development auth limit."
    );

// ==========================================
// Contact Form Limiter
// ==========================================
export const contactLimiter =
  process.env.NODE_ENV === "production"
    ? createLimiter(
      60,
      30,
      "Too many inquiries sent from this IP. Please try again after an hour."
    )
    : createLimiter(
      1,
      1000,
      "Development contact limit."
    );

// ==========================================
// Chatbot Limiter
// ==========================================
export const chatLimiter =
  process.env.NODE_ENV === "production"
    ? createLimiter(
      1,
      60,
      "Chatbot rate limit exceeded. Please wait a moment."
    )
    : createLimiter(
      1,
      1000,
      "Development chatbot limit."
    );

// ==========================================
// General API Limiter
// ==========================================
export const apiLimiter =
  process.env.NODE_ENV === "production"
    ? createLimiter(
      1,
      300,
      "API rate limit exceeded."
    )
    : createLimiter(
      1,
      5000,
      "Development API limit."
    );