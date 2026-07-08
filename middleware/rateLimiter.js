import rateLimit from 'express-rate-limit';

// Utility to create limiters
const createLimiter = (minutes, maxRequests, message) => {
  return rateLimit({
    windowMs: minutes * 60 * 1000,
    max: maxRequests,
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: { error: message },
    // Trust proxy if you are behind a reverse proxy (Heroku, Bluemix, AWS ELB, Nginx, etc)
    // You might need to set `app.set('trust proxy', 1);` in server.js
  });
};

export const globalLimiter = createLimiter(
  15,
  200,
  "Too many requests from this IP, please try again after 15 minutes."
);

export const authLimiter = createLimiter(
  15,
  20, // Strict limit for auth attempts
  "Too many authentication attempts, please try again after 15 minutes."
);

export const contactLimiter = createLimiter(
  60,
  5, // Very strict limit for contact forms to prevent spam
  "Too many inquiries sent from this IP, please try again after an hour."
);

export const chatLimiter = createLimiter(
  1,
  15, // 15 requests per minute for chatbot
  "Chatbot rate limit exceeded. Please wait a moment."
);

export const apiLimiter = createLimiter(
  1,
  60, // 60 general API requests per minute
  "API rate limit exceeded."
);
