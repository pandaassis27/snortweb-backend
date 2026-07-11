import mongoose from "mongoose";
import dns from "node:dns";
import { MongoMemoryServer } from "mongodb-memory-server";

import Admin from "../models/Admin.js";
import Project from "../models/Project.js";
import logger from "./logger.js";
import { envConfig } from "./env.js";

const MAX_RETRIES = 5;
let currentRetry = 0;
let mongod = null;

// --------------------------------------------------
// Development DNS Fix (MongoDB Atlas SRV issue)
// --------------------------------------------------
if (process.env.NODE_ENV !== "production") {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
  logger.info("Using Google DNS for MongoDB SRV resolution.");
}

// --------------------------------------------------
// MongoDB Events
// --------------------------------------------------

mongoose.connection.on("connecting", () => {
  logger.info("MongoDB connecting...");
});

mongoose.connection.on("connected", () => {
  logger.info("MongoDB connection established.");
});

mongoose.connection.on("disconnected", () => {
  logger.warn("MongoDB disconnected!");
});

mongoose.connection.on("reconnected", () => {
  logger.info("MongoDB reconnected successfully!");
});

mongoose.connection.on("error", (err) => {
  logger.error(`MongoDB connection error: ${err.message}`);
});

// --------------------------------------------------
// Connect Database
// --------------------------------------------------

const connectDB = async () => {
  try {
    let finalUri = envConfig.mongoUri;

    // -------------------------------
    // Localhost → Memory MongoDB
    // -------------------------------

    if (
      finalUri.includes("localhost") ||
      finalUri.includes("127.0.0.1")
    ) {
      try {
        logger.info("Attempting to connect to local MongoDB...");

        await mongoose.connect(finalUri, {
          serverSelectionTimeoutMS: 2000,
          family: 4,
        });
      } catch {
        logger.warn(
          "Local MongoDB not found. Starting MongoMemoryServer..."
        );

        mongod = await MongoMemoryServer.create();

        finalUri = mongod.getUri();
      }
    }

    // -------------------------------
    // Main Connection
    // -------------------------------

    if (mongoose.connection.readyState === 0) {
      const conn = await mongoose.connect(finalUri, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
        autoIndex: process.env.NODE_ENV !== "production",
        family: 4,
      });

      logger.info(`MongoDB Connected: ${conn.connection.host}`);
    } else {
      logger.info(
        `MongoDB Already Connected: ${mongoose.connection.host}`
      );
    }

    currentRetry = 0;

    // --------------------------------------------------
    // Seed Super Admin
    // --------------------------------------------------

    try {
      const adminCount = await Admin.countDocuments();

      if (adminCount === 0) {
        logger.info(
          "No admin found. Creating default superadmin..."
        );

        await Admin.create({
          username: "admin",
          email: "admin@snortweb.com",
          password: "admin123",
          role: "superadmin",
        });

        logger.info(
          "Default superadmin created successfully."
        );
      }
    } catch (err) {
      logger.error(`Admin Seed Error: ${err.message}`);
    }

    // --------------------------------------------------
    // Seed Projects
    // --------------------------------------------------

    try {
      const projectCount = await Project.countDocuments();

      if (projectCount === 0) {
        logger.info("No projects found. Seeding projects...");

        await Project.create([
          {
            title: "Hotel Reyansh Pride",
            description:
              "Premium hotel management platform.",
            category: "Dine & Cafe",
            tags: [
              "React",
              "Tailwind CSS",
              "Node.js",
              "Express",
            ],
            imageUrl:
              "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=800&q=80",
          },
          {
            title: "Reyansh Heights",
            description:
              "Modern Real Estate Platform.",
            category: "Real Estate",
            tags: [
              "React",
              "Three.js",
              "MongoDB",
            ],
            imageUrl:
              "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
          },
          {
            title: "Packzivo",
            description:
              "Packaging & Logistics Management.",
            category: "Logistics",
            tags: [
              "React",
              "Node.js",
              "PostgreSQL",
            ],
            imageUrl:
              "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=800&q=80",
            liveUrl: "#",
          },
        ]);

        logger.info("Default projects seeded successfully.");
      }
    } catch (err) {
      logger.error(`Project Seed Error: ${err.message}`);
    }
  } catch (error) {
    logger.error(`DATABASE ERROR: ${error.message}`);

    if (currentRetry < MAX_RETRIES) {
      currentRetry++;

      logger.info(
        `Retrying MongoDB connection (${currentRetry}/${MAX_RETRIES}) in 3 seconds...`
      );

      setTimeout(connectDB, 3000);
    } else {
      logger.error("==================================================");
      logger.error("MongoDB connection failed.");
      logger.error(`URI: ${envConfig.mongoUri}`);
      logger.error("==================================================");

      process.exit(1);
    }
  }
};

export default connectDB;