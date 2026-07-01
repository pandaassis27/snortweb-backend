import mongoose from "mongoose";
import Admin from "../models/Admin.js";
import Project from "../models/Project.js";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/snortweb", {
      serverSelectionTimeoutMS: 2000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    process.env.USE_MOCK_DB = "false";

    // Auto-seed admin if database is empty
    try {
      const adminCount = await Admin.countDocuments();
      if (adminCount === 0) {
        console.log("No administrators found in MongoDB database. Seeding default superadmin account...");
        await Admin.create({
          username: "admin",
          email: "admin@snortweb.com",
          password: "admin123", // Will be hashed automatically by pre-save hook
          role: "superadmin"
        });
        console.log("Default superadmin successfully seeded: admin@snortweb.com / admin123");
      }
    } catch (seedError) {
      console.error("Failed to seed default admin user:", seedError.message);
    }

    // Auto-seed projects if database is empty
    try {
      const projectCount = await Project.countDocuments();
      if (projectCount === 0) {
        console.log("No projects found in MongoDB database. Seeding default projects...");
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
        console.log("Default projects successfully seeded.");
      }
    } catch (seedError) {
      console.error("Failed to seed default projects:", seedError.message);
    }
  } catch (error) {
    console.warn(`==================================================`);
    console.warn(`DATABASE ERROR: ${error.message}`);
    console.warn(`MongoDB is not running at ${process.env.MONGO_URI || "mongodb://localhost:27017/snortweb"}`);
    console.warn(`FALLING BACK TO IN-MEMORY MOCK DATABASE!`);
    console.warn(`All additions/updates will be kept in memory.`);
    console.warn(`==================================================`);
    process.env.USE_MOCK_DB = "true";
  }
};

export default connectDB;
