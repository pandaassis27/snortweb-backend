import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import mongoSanitize from "express-mongo-sanitize";
import hpp from "hpp";
import connectDB from "./config/db.js";
import { envConfig } from "./config/env.js";
import logger from "./config/logger.js";
import { notFound, errorHandler } from "./middleware/errorMiddleware.js";
import { globalLimiter, authLimiter } from "./middleware/rateLimiter.js";
import authRoutes from "./routes/authRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import inquiryRoutes from "./routes/inquiryRoutes.js";
import auditRoutes from "./routes/auditRoutes.js";
import path from "path";
import { fileURLToPath } from "url";
import chatRoutes from "./routes/chatRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import serviceRoutes from "./routes/serviceRoutes.js";
import partnerRoutes from "./routes/partnerRoutes.js";
import blogRoutes from "./routes/blogRoutes.js";
import pageRoutes from "./routes/pageRoutes.js";
import mediaRoutes from "./routes/mediaRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables (done in env.js as well, but kept here for early loading)
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();
app.disable("x-powered-by");


// Trust Render reverse proxy
app.set("trust proxy", 1);

// Secure headers with Helmet
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'", envConfig.frontendUrl, envConfig.adminUrl, "http://localhost:*", "https://*"],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    xssFilter: true, // Adds X-XSS-Protection
    hidePoweredBy: true, // Removes X-Powered-By
  })
);

// =======================
// Production CORS Config
// =======================

const allowedOrigins = [
  "https://www.snortwebtechnology.com",
  "https://snortwebtechnology.com",
  "https://admin.snortwebtechnology.com",
  "https://snortweb-frontend.vercel.app",
  envConfig.frontendUrl,
  envConfig.adminUrl,
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:5176",
].filter(Boolean);

logger.info("Allowed Origins:");
logger.info(allowedOrigins);

app.use(
  cors({
    origin(origin, callback) {
      // Allow server-to-server requests and health checks
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      logger.warn(`Blocked CORS request from origin: ${origin}`);

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "X-CSRF-Token",
    ],
    optionsSuccessStatus: 200,
  })
);

app.options("*", cors());

// Compression Middleware (must be before body parsers for best effect on responses)
app.use(
  compression({
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
      if (req.headers["x-no-compression"]) {
        return false;
      }
      return compression.filter(req, res);
    },
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

const sanitizeInput = (data, key = "") => {
  // Skip HTML escaping for URL fields to prevent breaking valid links and storing encoded slashes
  if (typeof key === "string" && key.toLowerCase().endsWith("url")) {
    return typeof data === "string" ? data.trim() : data;
  }

  if (typeof data === "string") {
    return escapeString(data);
  } else if (Array.isArray(data)) {
    return data.map((item) => sanitizeInput(item, key));
  } else if (data !== null && typeof data === "object") {
    const cleaned = {};
    for (const k in data) {
      cleaned[k] = sanitizeInput(data[k], k);
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


// Prevent HTTP Parameter Pollution
app.use(hpp());



// Apply global rate limiter
app.use(globalLimiter);

// Log incoming requests using Winston
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'test') {
    const sanitizedUrl = req.url.replace(/[^\w\s\-\/\?\&\=\.]/gi, "");
    logger.info(`Incoming Request: ${req.method} ${sanitizedUrl}`, {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
  }
  next();
});
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});
// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use("/api", (req, res, next) => {
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  next();
});
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/inquiries", inquiryRoutes); // Specific limiters applied in route file
app.use("/api/chat", chatRoutes); // Specific limiters applied in route file
app.use("/api/settings", settingsRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/partners", partnerRoutes);
app.use("/api/blogs", blogRoutes);
app.use("/api/pages", pageRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/audit-logs", auditRoutes);

// Static file serving for uploads
app.use("/uploads", express.static(path.join(__dirname, "public", "uploads"), {
  setHeaders: (res, path, stat) => {
    res.set("X-Content-Type-Options", "nosniff");
    res.set("Content-Disposition", "inline");
    res.set("Cache-Control", "public, max-age=31536000");
  }
}));
// Base route
app.get("/", (req, res) => {
  res.json({ message: "Snortweb Admin API is running..." });
});

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

const PORT = envConfig.port;

const server = app.listen(PORT, () => {
  logger.info(`==================================================`);
  logger.info(`Snortweb Admin API Server is running in ${envConfig.nodeEnv} mode`);
  logger.info(`Listening on http://localhost:${PORT}`);
  logger.info(`==================================================`);
});

// Graceful Shutdown Handlers
const gracefulShutdown = () => {
  logger.info('Received kill signal, shutting down gracefully.');
  server.close(() => {
    logger.info('Closed out remaining connections.');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
