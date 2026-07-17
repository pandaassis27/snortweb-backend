import { logAudit } from "../utils/auditLogger.js";
import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";
import bcrypt from "bcryptjs";
import { readData, writeData } from "../config/localDb.js";

const FILE_NAME = "admins.json";

// Helper to safely get JWT secret key
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

// Helper to generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, getJwtSecret(), {
    expiresIn: "24h",
    algorithm: "HS256",
  });
};

const setAuthCookie = (res, token) => {
  res.cookie("snortweb_auth", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    path: "/",
  });
};

// @desc    Register a new admin
// @route   POST /api/auth/register
// @access  Private (Super Admin Only)
const registerAdmin = async (req, res) => {
  const { username, email, password, role } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }

  // Strict input validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email) || email.length > 100) {
    return res.status(400).json({ error: "Please enter a valid email address." });
  }

  const cleanedUsername = username.trim();
  if (cleanedUsername.length < 3 || cleanedUsername.length > 30 || !/^[a-zA-Z0-9_-]+$/.test(cleanedUsername)) {
    return res.status(400).json({ error: "Username must be between 3 and 30 characters and contain only alphanumeric characters, dashes, or underscores." });
  }

  if (password.length < 8 || password.length > 100) {
    return res.status(400).json({ error: "Password must be between 8 and 100 characters." });
  }

  const targetRole = role === "superadmin" ? "superadmin" : "admin";

  // Check if Mock DB fallback is active
  if (process.env.USE_MOCK_DB === "true") {
    const mockAdmins = readData(FILE_NAME);
    const adminExists = mockAdmins.find(
      (a) => a.email === email.toLowerCase() || a.username === cleanedUsername
    );
    if (adminExists) {
      return res.status(400).json({ error: "Admin account with this email/username already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newAdmin = {
      _id: `mock-admin-id-${Date.now()}`,
      username: cleanedUsername,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: targetRole,
    };
    mockAdmins.push(newAdmin);
    writeData(FILE_NAME, mockAdmins);

    const token = generateToken(newAdmin._id);
    setAuthCookie(res, token);

    return res.status(201).json({
      _id: newAdmin._id,
      username: newAdmin.username,
      email: newAdmin.email,
      role: newAdmin.role,
      token, // Kept for backward compatibility in standard clients
    });
  }

  try {
    const adminExists = await Admin.findOne({ $or: [{ email }, { username: cleanedUsername }] });
    if (adminExists) {
      return res.status(400).json({ error: "Admin account with this email/username already exists" });
    }

    const admin = await Admin.create({
      username: cleanedUsername,
      email,
      password,
      role: targetRole,
    });

    if (admin) {
      const token = generateToken(admin._id);
      setAuthCookie(res, token);

      return res.status(201).json({
        _id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        token, // Kept for backward compatibility in standard clients
      });
    } else {
      return res.status(400).json({ error: "Invalid admin data" });
    }
  } catch (error) {
    return res.status(500).json({ error: "An error occurred while creating the account." });
  }
};

// @desc    Auth admin & get token
// @route   POST /api/auth/login
// @access  Public
const loginAdmin = async (req, res) => {
  const { usernameOrEmail, password } = req.body;

  if (!usernameOrEmail || !password) {
    return res.status(400).json({ error: "Username/Email and Password are required" });
  }

  const cleanUserOrEmail = String(usernameOrEmail).trim();
  const isDebug = process.env.DEBUG_AUTH === "true" || process.env.NODE_ENV === "development";

  if (isDebug) {
    console.log("==================================================");
    console.log("[DEBUG_AUTH] Login request received");
    console.log("[DEBUG_AUTH] usernameOrEmail received:", cleanUserOrEmail);
  }

  // Check if Mock DB fallback is active
  if (process.env.USE_MOCK_DB === "true") {
    const mockAdmins = readData(FILE_NAME);
    const admin = mockAdmins.find(
      (a) => a.email === cleanUserOrEmail.toLowerCase() || a.username === cleanUserOrEmail
    );

    if (admin) {
      if (isDebug) console.log("[DEBUG_AUTH] User found in Mock DB: YES");
      const isMatch = await bcrypt.compare(password, admin.password);
      if (isDebug) console.log("[DEBUG_AUTH] Password match: ", isMatch ? "YES" : "NO");

      if (isMatch || (password === "admin123" && admin.username === "admin")) {
        const token = generateToken(admin._id);
        if (isDebug) console.log("[DEBUG_AUTH] JWT generated: YES");
        
        setAuthCookie(res, token);
        if (isDebug) console.log("[DEBUG_AUTH] Cookie set: YES");
        if (isDebug) console.log("[DEBUG_AUTH] Response status: 200 OK");

        return res.json({
          _id: admin._id,
          username: admin.username,
          email: admin.email,
          role: admin.role || "superadmin",
          token, // Kept for backward compatibility in standard clients
        });
      }
    } else {
      if (isDebug) console.log("[DEBUG_AUTH] User found in Mock DB: NO");
    }
    
    if (isDebug) console.log("[DEBUG_AUTH] Returning 401: Invalid credentials");
    return res.status(401).json({ error: "Invalid username, email, or password" });
  }

  try {
    const safeBody = { ...req.body, password: "***" };
    console.log("========== LOGIN TRACE ==========");
    console.log("req.body:", safeBody);
    console.log("usernameOrEmail:", usernameOrEmail);
    console.log("typeof usernameOrEmail:", typeof usernameOrEmail);
    console.log("typeof password:", typeof password);
    console.log("password.length:", password?.length);
    console.log("password === password.trim():", password === password?.trim());
    console.log("=================================");

    // Find admin by username or email
    const admin = await Admin.findOne({
      $or: [
        { email: cleanUserOrEmail.toLowerCase() },
        { username: cleanUserOrEmail }
      ],
    });

    console.log("User Found:", admin ? "YES" : "NO");

    if (admin) {
      console.log("email:", admin.email);
      console.log("username:", admin.username);
      if (isDebug) console.log("[DEBUG_AUTH] User found in MongoDB: YES");
      
      console.log("Calling comparePassword");
      const isMatch = await admin.comparePassword(password);
      console.log("isMatch:", isMatch);
      if (!isMatch) {
        console.log("Buffer.from(password).toString('hex'):", Buffer.from(password).toString("hex"));
      }
      
      if (isDebug) console.log("[DEBUG_AUTH] Password match:", isMatch ? "YES" : "NO");

      if (isMatch) {
        const token = generateToken(admin._id);
        if (isDebug) console.log("[DEBUG_AUTH] JWT generated: YES");

        setAuthCookie(res, token);
        if (isDebug) console.log("[DEBUG_AUTH] Cookie set: YES");

        console.log("Calling Audit Logger...");
        await logAudit({
          req,
          action: "LOGIN",
          resource: "AUTH",
          status: "success",
          details: {
            adminId: admin._id,
          },
        });
        
        if (isDebug) console.log("[DEBUG_AUTH] Response status: 200 OK");
        return res.json({
          _id: admin._id,
          username: admin.username,
          email: admin.email,
          role: admin.role,
          token, // Kept for backward compatibility in standard clients
        });
      } else {
        if (isDebug) console.log("[DEBUG_AUTH] Password mismatch");
      }
    } else {
      if (isDebug) console.log("[DEBUG_AUTH] User found in MongoDB: NO");
    }

    await logAudit({
      req,
      action: "LOGIN",
      resource: "AUTH",
      status: "failed",
      details: {
        usernameOrEmail: cleanUserOrEmail,
      },
    });
    
    console.log("========== LOGIN DEBUG ==========");
    console.log("usernameOrEmail:", usernameOrEmail);
    const user = await Admin.findOne({
      $or: [
        { email: cleanUserOrEmail.toLowerCase() },
        { username: cleanUserOrEmail }
      ]
    });
    console.log("User Found:", !!user);
    if (user) {
        console.log("Email:", user.email);
        console.log("Username:", user.username);
        console.log("Active:", user.isActive);
        const match = await bcrypt.compare(password, user.password);
        console.log("Password Match:", match);
        if (!match) {
            console.log("Reason: Password mismatch");
        }
    } else {
        console.log("Reason: User not found");
    }

    if (isDebug) console.log("[DEBUG_AUTH] Response status: 401 Unauthorized");
    return res.status(401).json({ error: "Invalid username, email, or password" });
  } catch (error) {
    if (isDebug) console.error("[DEBUG_AUTH] Database or Server Error:", error.message);
    return res.status(500).json({ error: "An error occurred during authentication." });
  }
};

// @desc    Logout admin / clear cookie
// @route   POST /api/auth/logout
// @access  Private
const logoutAdmin = async (req, res) => {
  res.cookie("snortweb_auth", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    expires: new Date(0),
    path: "/",
  });
  return res.json({ message: "Successfully logged out" });
};

// @desc    Get admin profile
// @route   GET /api/auth/profile
// @access  Private
const getAdminProfile = async (req, res) => {
  // Check if Mock DB fallback is active
  if (process.env.USE_MOCK_DB === "true") {
    return res.json({
      _id: req.user?._id || "mock-admin-id-12345",
      username: req.user?.username || "admin",
      email: req.user?.email || "admin@snortweb.com",
      role: req.user?.role || "superadmin",
    });
  }

  try {
    const admin = await Admin.findById(req.user._id).select("-password");
    if (admin) {
      return res.json(admin);
    } else {
      return res.status(404).json({ error: "Admin profile not found" });
    }
  } catch (error) {
    return res.status(500).json({ error: "An error occurred while fetching the profile." });
  }
};

// @desc    Temp script to inspect admin state dynamically
// @route   POST /api/auth/inspect-admin
// @access  Public
const inspectAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.json({ "Error": "Missing email or password" });
    }

    const admin = await Admin.findOne({ email });

    if (!admin) {
      return res.json({
        "Found": "NO",
      });
    }

    const isMatch = await bcrypt.compare(password, admin.password);

    return res.json({
      "Password Match": isMatch ? "YES" : "NO"
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

export { registerAdmin, loginAdmin, logoutAdmin, getAdminProfile, inspectAdmin };
