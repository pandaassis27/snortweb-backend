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
import chatRoutes from "./routes/chatRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";

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

// Cookie Parser (moved up so it parses cookies before security middleware checks them)
app.use(cookieParser());

// Prototype Pollution Prevention
const preventPrototypePollution = (obj) => {
  if (obj === null || typeof obj !== "object") return;
  for (const key in obj) {
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      delete obj[key];
    } else if (typeof obj[key] === "object") {
      preventPrototypePollution(obj[key]);
    }
  }
};

app.use((req, res, next) => {
  if (req.body) preventPrototypePollution(req.body);
  if (req.query) preventPrototypePollution(req.query);
  if (req.params) preventPrototypePollution(req.params);
  next();
});

// Robust HTML Escaping Sanitizer to prevent XSS
const escapeString = (str) => {
  if (typeof str !== "string") return str;
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;")
    .trim();
};

const sanitizeInput = (data) => {
  if (typeof data === "string") {
    return escapeString(data);
  } else if (Array.isArray(data)) {
    return data.map((item) => sanitizeInput(item));
  } else if (data !== null && typeof data === "object") {
    const cleaned = {};
    for (const key in data) {
      cleaned[key] = sanitizeInput(data[key]);
    }
    return cleaned;
  }
  return data;
};

app.use((req, res, next) => {
  if (req.body) {
    req.body = sanitizeInput(req.body);
  }
  if (req.query) {
    req.query = sanitizeInput(req.query);
  }
  next();
});

// CSRF Protection Middleware
const csrfProtection = (req, res, next) => {
  const stateChangingMethods = ["POST", "PUT", "DELETE", "PATCH"];
  if (!stateChangingMethods.includes(req.method)) {
    return next();
  }

  // Requests using custom Bearer Authorization token are inherently safe from CSRF
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    return next();
  }

  const origin = req.headers.origin;
  const referer = req.headers.referer;
  const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:5176",
  ];

  if (origin && !allowedOrigins.includes(origin)) {
    return res.status(403).json({ error: "CSRF Alert: Request origin is not authorized." });
  }

  if (!origin && referer) {
    try {
      const refererUrl = new URL(referer);
      if (!allowedOrigins.includes(refererUrl.origin)) {
        return res.status(403).json({ error: "CSRF Alert: Request referer is not authorized." });
      }
    } catch (err) {
      return res.status(400).json({ error: "Invalid Referer header." });
    }
  }

  // If authenticated via cookie, require custom CSRF validation header
  if (req.cookies && req.cookies.token) {
    if (!req.headers["x-requested-with"] && !req.headers["x-csrf-token"]) {
      return res.status(403).json({ error: "CSRF Alert: Verification headers missing." });
    }
  }

  next();
};
app.use(csrfProtection);

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

// API Routes
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/inquiries", inquiryRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/settings", settingsRoutes);

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
  
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: "Invalid JSON input." });
  }

  res.status(statusCode).json({
    error: "An internal server error occurred.",
  });
});

const PORT = process.env.PORT || 5050;

app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`Snortweb Admin API Server is running in ${process.env.NODE_ENV || "development"} mode`);
  console.log(`Listening on http://localhost:${PORT}`);
  console.log(`==================================================`);
});
