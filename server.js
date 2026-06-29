import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import mongoSanitize from "express-mongo-sanitize";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import inquiryRoutes from "./routes/inquiryRoutes.js";

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Secure headers with Helmet
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'", "http://localhost:*", "https://*"],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })
);

// Secure CORS config
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:5176",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like local requests or same-origin)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    optionsSuccessStatus: 200,
  })
);

// Body Parser
app.use(express.json({ limit: "10kb" })); // Restrict body size to prevent DoS

// XSS Sanitizer (Strip HTML tags)
const sanitizeString = (str) => {
  if (typeof str !== "string") return str;
  return str.replace(/<[^>]*>/g, "").trim();
};
app.use((req, res, next) => {
  if (req.body) {
    for (const key in req.body) {
      if (typeof req.body[key] === "string") {
        req.body[key] = sanitizeString(req.body[key]);
      } else if (Array.isArray(req.body[key])) {
        req.body[key] = req.body[key].map((item) => (typeof item === "string" ? sanitizeString(item) : item));
      }
    }
  }
  next();
});

// Cookie Parser
app.use(cookieParser());

// Prevent NoSQL Injection
app.use(mongoSanitize());

// Rate Limiters
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests from this IP, please try again after 15 minutes." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit to 20 attempts
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authentication requests, please try again after 15 minutes." },
});

// Apply global rate limiter
app.use(globalLimiter);

// Log incoming requests (sanitized for security)
app.use((req, res, next) => {
  const sanitizedUrl = req.url.replace(/[^\w\s\-\/\?\&\=\.]/gi, "");
  console.log(`[${new Date().toISOString()}] ${req.method} ${sanitizedUrl}`);
  next();
});

// Routes
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/inquiries", inquiryRoutes);

// Base route
app.get("/", (req, res) => {
  res.json({ message: "Snortweb Admin API is running..." });
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ error: `Not found - ${req.originalUrl}` });
});

// Global error handler
app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  console.error(`[ERROR] ${err.stack || err.message}`);
  
  res.status(statusCode).json({
    error: process.env.NODE_ENV === "production" ? "An internal server error occurred." : err.message,
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`Snortweb Admin API Server is running in ${process.env.NODE_ENV || "development"} mode`);
  console.log(`Listening on http://localhost:${PORT}`);
  console.log(`==================================================`);
});
