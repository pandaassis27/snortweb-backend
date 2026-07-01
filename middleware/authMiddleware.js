import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";
import { readData } from "../config/localDb.js";

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      console.error("FATAL ERROR: JWT_SECRET environment variable is missing in production!");
      process.exit(1);
    }
    return "snortweb_super_secret_jwt_key_12345";
  }
  return secret;
};

const protect = async (req, res, next) => {
  let token;

  // Retrieve token from either the cookies or authorization headers
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ error: "Not authorized, no token provided" });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, getJwtSecret());

    // Check if Mock DB fallback is active
    if (process.env.USE_MOCK_DB === "true") {
      const mockAdmins = readData("admins.json");
      const mockAdmin = mockAdmins.find((a) => a._id === decoded.id);
      if (!mockAdmin) {
        return res.status(401).json({ error: "Not authorized, admin not found" });
      }
      // Exclude password
      const { password, ...adminData } = mockAdmin;
      // Default mock admin to superadmin if role is not set
      if (!adminData.role) {
        adminData.role = "superadmin";
      }
      req.user = adminData;
      return next();
    }

    // Get admin from database
    req.user = await Admin.findById(decoded.id).select("-password");

    if (!req.user) {
      return res.status(401).json({ error: "Not authorized, admin not found" });
    }

    next();
  } catch (error) {
    console.error("JWT Verification Error:", error.message);
    return res.status(401).json({ error: "Not authorized, token validation failed" });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authorized, user credentials missing" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied: Insufficient privileges" });
    }
    next();
  };
};

export { protect, authorize };
