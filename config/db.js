import mongoose from "mongoose";
import Admin from "../models/Admin.js";
import Project from "../models/Project.js";
import logger from "./logger.js";
import { envConfig } from "./env.js";

const MAX_RETRIES = 5;
let currentRetry = 0;

// Listeners for mongoose connection events
mongoose.connection.on('connecting', () => {
  logger.info('MongoDB connecting...');
});

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected! Attempting to reconnect...');
});

mongoose.connection.on('reconnected', () => {
  logger.info('MongoDB reconnected successfully!');
});

mongoose.connection.on('error', (err) => {
  logger.error(`MongoDB connection error: ${err.message}`);
});

import { MongoMemoryServer } from 'mongodb-memory-server';

let mongod = null;

const connectDB = async () => {
  try {
    let finalUri = envConfig.mongoUri;

    // Intercept localhost and provide a real in-memory MongoDB if local mongod is down
    if (finalUri.includes('localhost') || finalUri.includes('127.0.0.1')) {
      try {
        logger.info("Attempting to connect to local MongoDB...");
        // Try local first, timeout very quickly
        await mongoose.connect(finalUri, { serverSelectionTimeoutMS: 2000 });
      } catch (err) {
        logger.warn("Local MongoDB not found. Spinning up real in-memory MongoDB instance...");
        mongod = await MongoMemoryServer.create();
        finalUri = mongod.getUri();
      }
    }

    if (mongoose.connection.readyState === 0) {
      const conn = await mongoose.connect(finalUri, {
        serverSelectionTimeoutMS: 5000,
        autoIndex: process.env.NODE_ENV !== 'production',
        maxPoolSize: 10,
        socketTimeoutMS: 45000,
        family: 4
      });
      logger.info(`MongoDB Connected: ${conn.connection.host}`);
    } else {
      logger.info(`MongoDB Connected: ${mongoose.connection.host}`);
    }
        currentRetry = 0; // Reset retries on successful connection

    // Auto-seed admin if database is empty
    try {
      const adminCount = await Admin.countDocuments();
      if (adminCount === 0) {
        logger.info("No administrators found in MongoDB database. Seeding default superadmin account...");
        await Admin.create({
          username: "admin",
          email: "admin@snortweb.com",
          password: "admin123", // Will be hashed automatically by pre-save hook
          role: "superadmin"
        });
        logger.info("Default superadmin successfully seeded: admin@snortweb.com / admin123");
      }
    } catch (seedError) {
      logger.error(`Failed to seed default admin user: ${seedError.message}`);
    }

    // Auto-seed projects if database is empty
    try {
      const projectCount = await Project.countDocuments();
      if (projectCount === 0) {
        logger.info("No projects found in MongoDB database. Seeding default projects...");
        await Project.create([
          {
            title: "Hotel Reyansh Pride",
            description: "A premium signature cafe & dine-in experience interface designed with custom booking, menu customization, and sleek order analytics.",
            category: "Dine & Cafe",
            tags: ["React", "Tailwind CSS", "Node.js", "Express"],
            imageUrl: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=800&q=80",
          },
          {
            title: "Reyansh Heights Real Estate",
            description: "Next-gen real estate platform featuring high-fidelity architectural showcases, dynamic virtual tours, and a secure client portal.",
            category: "Real Estate",
            tags: ["React", "Three.js", "MongoDB", "Tailwind CSS"],
            imageUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
          },
          {
            title: "Packzivo Packaging",
            description: "Custom bulk packaging builder and supply chain logistics tracker tailored for premium eco-friendly shipping materials.",
            category: "Logistics & Supply",
            tags: ["React", "Framer Motion", "Node.js", "PostgreSQL"],
            imageUrl: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=800&q=80",
            liveUrl: "#",
          }
        ]);
        logger.info("Default projects successfully seeded.");
      }
    } catch (seedError) {
      logger.error(`Failed to seed default projects: ${seedError.message}`);
    }
  } catch (error) {
    logger.error(`DATABASE ERROR: ${error.message}`);
    
    if (currentRetry < MAX_RETRIES) {
      currentRetry++;
      logger.info(`Retrying MongoDB connection (${currentRetry}/${MAX_RETRIES}) in 3 seconds...`);
      setTimeout(connectDB, 3000);
    } else {
      logger.error(`==================================================`);
      logger.error(`MongoDB connection failed after ${MAX_RETRIES} retries.`);
      logger.error(`Please ensure MongoDB is running at ${envConfig.mongoUri}`);
      logger.error(`==================================================`);
      process.exit(1);
    }
  }
};

export default connectDB;
