import mongoose from "mongoose";
import dotenv from "dotenv";
import dns from "node:dns";
import Project from "./models/Project.js";

// Load environment variables (MONGO_URI)
dotenv.config();

// Apply the same DNS fix used in db.js for SRV resolution
if (process.env.NODE_ENV !== "production") {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
}

// Reverse the specific HTML escaping done by the old sanitizer
const decodeHtmlEntities = (str) => {
  if (typeof str !== "string") return str;
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&#x2f;/g, "/"); // Included lowercase 'f' just in case
};

const URL_FIELDS = ["imageUrl", "liveUrl", "githubUrl", "videoUrl", "glbModelUrl"];

const migrateUrls = async () => {
  console.log("Starting URL Migration Script...");

  if (!process.env.MONGO_URI) {
    console.error("ERROR: MONGO_URI is not defined in your environment variables.");
    process.exit(1);
  }

  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to database successfully.");

    const projects = await Project.find({});
    let updatedCount = 0;

    for (const project of projects) {
      let isModified = false;

      URL_FIELDS.forEach((field) => {
        const originalValue = project[field];
        if (typeof originalValue === "string") {
          const decodedValue = decodeHtmlEntities(originalValue);
          
          if (originalValue !== decodedValue) {
            project[field] = decodedValue;
            isModified = true;
          }
        }
      });

      // Only save if a URL field actually changed to minimize DB writes
      if (isModified) {
        await project.save();
        updatedCount++;
        console.log(`[UPDATED] Project ID: ${project._id} | Title: ${project.title}`);
      }
    }

    console.log(`\nMigration completed successfully.`);
    console.log(`Total projects checked: ${projects.length}`);
    console.log(`Total projects updated: ${updatedCount}`);

  } catch (error) {
    console.error("\nMigration encountered an error:", error);
  } finally {
    console.log("Closing database connection...");
    await mongoose.connection.close();
    process.exit(0);
  }
};

migrateUrls();
