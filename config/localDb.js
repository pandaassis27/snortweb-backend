import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, "..", "data");

// Create data directory if it doesn't exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Default seed data
const defaultSeeds = {
  "reviews.json": [],
  "admins.json": [
    {
      _id: "mock-admin-id-12345",
      username: "admin",
      email: "admin@snortweb.com",
      password: "$2a$10$iW3x8H3L8qFmC7nJ1a8u3O0oK7hY6rE7tP4gS5wR6qT7uX8z9y2w6", // bcrypt of "admin123"
      role: "superadmin"
    }
  ],
  "inquiries.json": [
    {
      _id: "mock-inquiry-1",
      name: "Anish Sharma",
      email: "anish@alphatech.com",
      company: "Alpha Tech Solutions",
      service: "Security Testing & Analysis",
      budget: "₹1L–₹5L",
      message: "We need an external penetration testing and security audit done on our core banking web application. Please get in touch to discuss details.",
      read: false,
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
    },
    {
      _id: "mock-inquiry-2",
      name: "Priya Patel",
      email: "priya@nexus.io",
      company: "Nexus E-Commerce",
      service: "Web App Development",
      budget: "₹5L+",
      message: "Looking to build a highly responsive and custom React e-commerce platform integrated with local payment APIs.",
      read: true,
      createdAt: new Date(Date.now() - 86400000).toISOString()
    },
    {
      _id: "mock-inquiry-3",
      name: "Rahul Gupta",
      email: "rahul@guptaconsulting.com",
      company: "Gupta & Sons",
      service: "Website Development",
      budget: "₹50K–₹1L",
      message: "Hi, I am interested in building a high-speed corporate landing page with nice animations and modern design.",
      read: false,
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString()
    }
  ],
  "projects.json": [
    {
      _id: "mock-project-1",
      title: "Hotel Reyansh Pride",
      description: "A premium signature cafe & dine-in experience interface designed with custom booking, menu customization, and sleek order analytics.",
      category: "Dine & Cafe",
      tags: ["React", "Tailwind CSS", "Node.js", "Express"],
      imageUrl: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=800&q=80",
      createdAt: new Date().toISOString()
    },
    {
      _id: "mock-project-2",
      title: "Reyansh Heights Real Estate",
      description: "Next-gen real estate platform featuring high-fidelity architectural showcases, dynamic virtual tours, and a secure client portal.",
      category: "Real Estate",
      tags: ["React", "Three.js", "MongoDB", "Tailwind CSS"],
      imageUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
      createdAt: new Date(Date.now() - 86400000).toISOString()
    },
    {
      _id: "mock-project-3",
      title: "Packzivo Packaging",
      description: "Custom bulk packaging builder and supply chain logistics tracker tailored for premium eco-friendly shipping materials.",
      category: "Logistics & Supply",
      tags: ["React", "Framer Motion", "Node.js", "PostgreSQL"],
      imageUrl: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=800&q=80",
      liveUrl: "#",
      isLive: true,
      createdAt: new Date(Date.now() - 172800000).toISOString()
    }
  ]
};

const ALLOWED_FILES = ["admins.json", "projects.json", "reviews.json", "inquiries.json"];

const validateFilename = (filename) => {
  if (!ALLOWED_FILES.includes(filename)) {
    throw new Error("Access denied: Invalid database file requested.");
  }
};

export const readData = (filename) => {
  validateFilename(filename);
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    // Seed with default data if not exists
    const seedContent = defaultSeeds[filename] || [];
    writeData(filename, seedContent);
    return seedContent;
  }
  
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  } catch (error) {
    console.error(`Error reading local db file ${filename}:`, error.message);
    return defaultSeeds[filename] || [];
  }
};

export const writeData = (filename, data) => {
  validateFilename(filename);
  const filePath = path.join(DATA_DIR, filename);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error(`Error writing local db file ${filename}:`, error.message);
  }
};
