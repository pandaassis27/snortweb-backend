import Inquiry from "../models/Inquiry.js";
import { readData, writeData } from "../config/localDb.js";

const FILE_NAME = "inquiries.json";

// Safe ID validation
const isValidId = (id) => {
  if (process.env.USE_MOCK_DB === "true") {
    return /^[a-zA-Z0-9-]+$/.test(id);
  }
  return /^[0-9a-fA-F]{24}$/.test(id);
};

// @desc    Get all inquiries
// @route   GET /api/inquiries
// @access  Private (Admin Only)
const getInquiries = async (req, res) => {
  if (process.env.USE_MOCK_DB === "true") {
    const mockInquiries = readData(FILE_NAME);
    return res.json(mockInquiries);
  }

  try {
    const inquiries = await Inquiry.find({}).sort({ createdAt: -1 });
    return res.json(inquiries);
  } catch (error) {
    return res.status(500).json({ error: "An error occurred while fetching inquiries." });
  }
};

// @desc    Get single inquiry by ID
// @route   GET /api/inquiries/:id
// @access  Private (Admin Only)
const getInquiryById = async (req, res) => {
  const { id } = req.params;

  if (!isValidId(id)) {
    return res.status(400).json({ error: "Invalid inquiry ID format." });
  }

  if (process.env.USE_MOCK_DB === "true") {
    const mockInquiries = readData(FILE_NAME);
    const inquiry = mockInquiries.find((i) => i._id === id);
    if (inquiry) {
      return res.json(inquiry);
    }
    return res.status(404).json({ error: "Inquiry not found" });
  }

  try {
    const inquiry = await Inquiry.findById(id);
    if (inquiry) {
      return res.json(inquiry);
    } else {
      return res.status(404).json({ error: "Inquiry not found" });
    }
  } catch (error) {
    return res.status(500).json({ error: "An error occurred while fetching the inquiry." });
  }
};

// @desc    Create a new inquiry
// @route   POST /api/inquiries
// @access  Public
const createInquiry = async (req, res) => {
  const { name, email, company, service, budget, message } = req.body;

  if (!name || !email || !service || !budget || !message) {
    return res.status(400).json({ error: "Name, email, service, budget, and message are required" });
  }

  // Server-side strict validation
  const cleanName = String(name).trim();
  const cleanEmail = String(email).trim();
  const cleanCompany = company ? String(company).trim() : "";
  const cleanService = String(service).trim();
  const cleanBudget = String(budget).trim();
  const cleanMessage = String(message).trim();

  if (cleanName.length < 2 || cleanName.length > 50) {
    return res.status(400).json({ error: "Name must be between 2 and 50 characters." });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail) || cleanEmail.length > 100) {
    return res.status(400).json({ error: "Please enter a valid email address." });
  }

  if (cleanCompany.length > 100) {
    return res.status(400).json({ error: "Company name must not exceed 100 characters." });
  }

  if (cleanService.length < 2 || cleanService.length > 100) {
    return res.status(400).json({ error: "Service choice must be between 2 and 100 characters." });
  }

  if (cleanBudget.length < 2 || cleanBudget.length > 50) {
    return res.status(400).json({ error: "Budget field must be between 2 and 50 characters." });
  }

  if (cleanMessage.length < 10 || cleanMessage.length > 3000) {
    return res.status(400).json({ error: "Message must be between 10 and 3000 characters." });
  }

  if (process.env.USE_MOCK_DB === "true") {
    const mockInquiries = readData(FILE_NAME);
    const newInquiry = {
      _id: `mock-inquiry-${Date.now()}`,
      name: cleanName,
      email: cleanEmail,
      company: cleanCompany,
      service: cleanService,
      budget: cleanBudget,
      message: cleanMessage,
      read: false,
      createdAt: new Date().toISOString()
    };
    mockInquiries.unshift(newInquiry);
    writeData(FILE_NAME, mockInquiries);
    return res.status(201).json(newInquiry);
  }

  try {
    const inquiry = new Inquiry({
      name: cleanName,
      email: cleanEmail,
      company: cleanCompany,
      service: cleanService,
      budget: cleanBudget,
      message: cleanMessage,
    });

    const createdInquiry = await inquiry.save();
    return res.status(201).json(createdInquiry);
  } catch (error) {
    return res.status(500).json({ error: "An error occurred while submitting the inquiry." });
  }
};

// @desc    Update inquiry status (read/unread)
// @route   PUT /api/inquiries/:id
// @access  Private (Admin Only)
const updateInquiryStatus = async (req, res) => {
  const { id } = req.params;
  const { read } = req.body;

  if (!isValidId(id)) {
    return res.status(400).json({ error: "Invalid inquiry ID format." });
  }

  if (read === undefined) {
    return res.status(400).json({ error: "Read status is required" });
  }

  const isRead = Boolean(read);

  if (process.env.USE_MOCK_DB === "true") {
    const mockInquiries = readData(FILE_NAME);
    const inquiry = mockInquiries.find((i) => i._id === id);
    if (inquiry) {
      inquiry.read = isRead;
      writeData(FILE_NAME, mockInquiries);
      return res.json(inquiry);
    }
    return res.status(404).json({ error: "Inquiry not found" });
  }

  try {
    const inquiry = await Inquiry.findById(id);

    if (inquiry) {
      inquiry.read = isRead;
      const updatedInquiry = await inquiry.save();
      return res.json(updatedInquiry);
    } else {
      return res.status(404).json({ error: "Inquiry not found" });
    }
  } catch (error) {
    return res.status(500).json({ error: "An error occurred while updating the inquiry status." });
  }
};

// @desc    Delete an inquiry
// @route   DELETE /api/inquiries/:id
// @access  Private (Admin Only)
const deleteInquiry = async (req, res) => {
  const { id } = req.params;

  if (!isValidId(id)) {
    return res.status(400).json({ error: "Invalid inquiry ID format." });
  }

  if (process.env.USE_MOCK_DB === "true") {
    const mockInquiries = readData(FILE_NAME);
    const inquiryIndex = mockInquiries.findIndex((i) => i._id === id);
    if (inquiryIndex !== -1) {
      const removedInquiry = mockInquiries.splice(inquiryIndex, 1)[0];
      writeData(FILE_NAME, mockInquiries);
      return res.json({ message: "Inquiry removed successfully", inquiry: removedInquiry });
    }
    return res.status(404).json({ error: "Inquiry not found" });
  }

  try {
    const inquiry = await Inquiry.findById(id);

    if (inquiry) {
      await inquiry.deleteOne();
      return res.json({ message: "Inquiry removed successfully" });
    } else {
      return res.status(404).json({ error: "Inquiry not found" });
    }
  } catch (error) {
    return res.status(500).json({ error: "An error occurred while deleting the inquiry." });
  }
};

export {
  getInquiries,
  getInquiryById,
  createInquiry,
  updateInquiryStatus,
  deleteInquiry,
};
