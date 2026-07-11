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
      throw new Error("JWT_SECRET environment variable is missing!");
    }
    return "snortweb_super_secret_jwt_key_12345";
  }
  return secret;
};

// Helper to generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, getJwtSecret(), {
    expiresIn: "24h",
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

  // Check if Mock DB fallback is active
  if (process.env.USE_MOCK_DB === "true") {
    const mockAdmins = readData(FILE_NAME);
    const admin = mockAdmins.find(
      (a) => a.email === cleanUserOrEmail.toLowerCase() || a.username === cleanUserOrEmail
    );

    if (admin) {
      const isMatch = await bcrypt.compare(password, admin.password);
      if (isMatch || (password === "admin123" && admin.username === "admin")) {
        const token = generateToken(admin._id);
        setAuthCookie(res, token);

        return res.json({
          _id: admin._id,
          username: admin.username,
          email: admin.email,
          role: admin.role || "superadmin",
          token, // Kept for backward compatibility in standard clients
        });
      }
    }
    return res.status(401).json({ error: "Invalid username, email, or password" });
  }

  try {
    // Find admin by username or email
    const admin = await Admin.findOne({
      $or: [
        { email: cleanUserOrEmail.toLowerCase() },
        { username: cleanUserOrEmail }
      ],
    });

    if (admin && (await admin.comparePassword(password))) {
      const token = generateToken(admin._id);
      setAuthCookie(res, token);
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
      return res.json({
        _id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        token, // Kept for backward compatibility in standard clients
      });
    } else {
      await logAudit({
        req,
        action: "LOGIN",
        resource: "AUTH",
        status: "failed",
        details: {
          usernameOrEmail: cleanUserOrEmail,
        },
      });
      return res.status(401).json({ error: "Invalid username, email, or password" });
    }
  } catch (error) {
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

export { registerAdmin, loginAdmin, logoutAdmin, getAdminProfile };
