import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";
import { mockAdmins } from "../controllers/authController.js";

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
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "snortweb_super_secret_jwt_key_12345");

    // Check if Mock DB fallback is active
    if (process.env.USE_MOCK_DB === "true") {
      const mockAdmin = mockAdmins.find((a) => a._id === decoded.id);
      if (!mockAdmin) {
        return res.status(401).json({ error: "Not authorized, admin not found" });
      }
      // Exclude password
      const { password, ...adminData } = mockAdmin;
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

export { protect };
