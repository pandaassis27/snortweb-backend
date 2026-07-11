import Inquiry from "../models/Inquiry.js";
import { readData, writeData } from "../config/localDb.js";
import { logAudit } from "../utils/auditLogger.js";
import logger from "../config/logger.js";

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
    const { paginate, page = 1, limit = 10, search, read, sortBy = "createdAt", sortOrder = "desc" } = req.query;
    const isPaginated = paginate === "true";

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { subject: { $regex: search, $options: "i" } }
      ];
    }
    if (read !== undefined && read !== "") {
      query.read = read === "true";
    }

    const sortConfig = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    if (!isPaginated) {
      const inquiries = await Inquiry.find(query).sort(sortConfig);
      return res.json(inquiries);
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const [inquiries, total] = await Promise.all([
      Inquiry.find(query).sort(sortConfig).skip(skip).limit(limitNum),
      Inquiry.countDocuments(query)
    ]);

    return res.json({
      data: inquiries,
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum)
    });
  } catch (error) {
    logger.error("Error in getInquiries: " + error.message);
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

  if (cleanMessage.length === 0) {
    return res.status(400).json({
      error: "Message is required."
    });
  }

  if (cleanMessage.length > 3000) {
    return res.status(400).json({
      error: "Message cannot exceed 3000 characters."
    });

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

// @desc    Bulk delete inquiries
// @route   POST /api/inquiries/bulk-delete
// @access  Private (SuperAdmin)
const bulkDeleteInquiries = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "No inquiry IDs provided for deletion." });
    }

    // Validate IDs
    for (const id of ids) {
      if (!isValidId(id)) return res.status(400).json({ error: `Invalid ID format: ${id}` });
    }

    if (process.env.USE_MOCK_DB === "true") {
      let mockInquiries = readData(FILE_NAME);
      const initialLength = mockInquiries.length;
      mockInquiries = mockInquiries.filter((p) => !ids.includes(p._id));
      writeData(FILE_NAME, mockInquiries);
      const deletedCount = initialLength - mockInquiries.length;
      
      logAudit({
        req,
        action: "BULK_DELETE_INQUIRIES",
        resource: "INQUIRY",
        status: "success",
        details: { deletedCount, ids },
      });
      return res.json({ message: `${deletedCount} inquiries deleted successfully.` });
    }

    const result = await Inquiry.deleteMany({ _id: { $in: ids } });

    logAudit({
      req,
      action: "BULK_DELETE_INQUIRIES",
      resource: "INQUIRY",
      status: "success",
      details: { deletedCount: result.deletedCount, ids },
    });

    return res.json({ message: `${result.deletedCount} inquiries deleted successfully.` });
  } catch (error) {
    logger.error("Error in bulkDeleteInquiries: " + error.message);
    logAudit({
      req,
      action: "BULK_DELETE_INQUIRIES",
      resource: "INQUIRY",
      status: "failed",
      details: { error: error.message },
    });
    return res.status(500).json({ error: "An error occurred while bulk deleting inquiries." });
  }
};

export {
  getInquiries,
  getInquiryById,
  createInquiry,
  updateInquiryStatus,
  deleteInquiry,
  bulkDeleteInquiries,
};
