import AuditLog from "../models/AuditLog.js";
import logger from "../config/logger.js";

// @desc    Get paginated audit logs with advanced filtering and search
// @route   GET /api/audit-logs
// @access  Private (Superadmin/Admin)
export const getAuditLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const sortField = req.query.sortBy || "createdAt";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

    const query = {};

    // Search by username or action
    if (req.query.search) {
      query.$or = [
        { username: { $regex: req.query.search, $options: "i" } },
        { action: { $regex: req.query.search, $options: "i" } },
      ];
    }

    // Filter by exact status
    if (req.query.status && req.query.status !== "All") {
      query.status = req.query.status;
    }

    // Filter by exact resource
    if (req.query.resource && req.query.resource !== "All") {
      query.resource = req.query.resource;
    }

    // Filter by date range
    if (req.query.startDate || req.query.endDate) {
      query.createdAt = {};
      if (req.query.startDate) {
        query.createdAt.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        // Set end date to end of the day to include everything up to midnight
        const end = new Date(req.query.endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const total = await AuditLog.countDocuments(query);
    const logs = await AuditLog.find(query)
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(limit)
      .populate("admin", "username email");

    res.json({
      logs,
      page,
      pages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    logger.error("Get Audit Logs Error: " + error.message);
    res.status(500).json({ message: "Server error" });
  }
};
