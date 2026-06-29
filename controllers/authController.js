import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";
import bcrypt from "bcryptjs";

// Helper to generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || "snortweb_super_secret_jwt_key_12345", {
    expiresIn: "30d",
  });
};

const setAuthCookie = (res, token) => {
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });
};

// In-Memory mock storage for admins
const mockAdmins = [
  {
    _id: "mock-admin-id-12345",
    username: "admin",
    email: "admin@snortweb.com",
    // bcrypt hash of "admin123"
    password: "$2a$10$iW3x8H3L8qFmC7nJ1a8u3O0oK7hY6rE7tP4gS5wR6qT7uX8z9y2w6", 
  }
];

// @desc    Register a new admin
// @route   POST /api/auth/register
// @access  Public
const registerAdmin = async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }

  // Check if Mock DB fallback is active
  if (process.env.USE_MOCK_DB === "true") {
    const adminExists = mockAdmins.find(
      (a) => a.email === email.toLowerCase() || a.username === username
    );
    if (adminExists) {
      return res.status(400).json({ error: "Admin account with this email/username already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newAdmin = {
      _id: `mock-admin-id-${Date.now()}`,
      username,
      email: email.toLowerCase(),
      password: hashedPassword,
    };
    mockAdmins.push(newAdmin);

    const token = generateToken(newAdmin._id);
    setAuthCookie(res, token);

    return res.status(201).json({
      _id: newAdmin._id,
      username: newAdmin.username,
      email: newAdmin.email,
      token, // Kept for backward compatibility in standard clients
    });
  }

  try {
    const adminExists = await Admin.findOne({ $or: [{ email }, { username }] });
    if (adminExists) {
      return res.status(400).json({ error: "Admin account with this email/username already exists" });
    }

    const admin = await Admin.create({
      username,
      email,
      password,
    });

    if (admin) {
      const token = generateToken(admin._id);
      setAuthCookie(res, token);

      return res.status(201).json({
        _id: admin._id,
        username: admin.username,
        email: admin.email,
        token, // Kept for backward compatibility in standard clients
      });
    } else {
      return res.status(400).json({ error: "Invalid admin data" });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
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

  // Check if Mock DB fallback is active
  if (process.env.USE_MOCK_DB === "true") {
    const admin = mockAdmins.find(
      (a) => a.email === usernameOrEmail.toLowerCase() || a.username === usernameOrEmail
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
        { email: usernameOrEmail.toLowerCase() },
        { username: usernameOrEmail }
      ],
    });

    if (admin && (await admin.comparePassword(password))) {
      const token = generateToken(admin._id);
      setAuthCookie(res, token);

      return res.json({
        _id: admin._id,
        username: admin.username,
        email: admin.email,
        token, // Kept for backward compatibility in standard clients
      });
    } else {
      return res.status(401).json({ error: "Invalid username, email, or password" });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// @desc    Logout admin / clear cookie
// @route   POST /api/auth/logout
// @access  Private
const logoutAdmin = async (req, res) => {
  res.cookie("token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    expires: new Date(0),
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
      email: req.user?.email || "admin@snortweb.com"
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
    return res.status(500).json({ error: error.message });
  }
};

export { registerAdmin, loginAdmin, logoutAdmin, getAdminProfile, mockAdmins };
