import Project from "../models/Project.js";
import Review from "../models/Review.js";
import Inquiry from "../models/Inquiry.js";
import Media from "../models/Media.js";
import Admin from "../models/Admin.js";
import AuditLog from "../models/AuditLog.js";
import logger from "../config/logger.js";
import { readData } from "../config/localDb.js";

// @desc    Get dashboard statistics
// @route   GET /api/dashboard/stats
// @access  Private (Admin)
export const getDashboardStats = async (req, res) => {
  try {
    if (process.env.USE_MOCK_DB === "true") {
      // Mock DB implementation for local dev without MongoDB
      const projects = readData("projects.json");
      const reviews = readData("reviews.json");
      const inquiries = readData("inquiries.json");
      const admins = readData("admins.json");

      return res.json({
        stats: {
          totalProjects: projects.length,
          totalReviews: reviews.length,
          approvedReviews: reviews.filter((r) => r.approved).length,
          pendingReviews: reviews.filter((r) => !r.approved).length,
          totalInquiries: inquiries.length,
          unreadInquiries: inquiries.filter((i) => !i.read).length,
          totalMedia: 0,
          totalAdmins: admins.length,
        },
        recentActivity: {
          projects: projects.slice(0, 5),
          reviews: reviews.slice(0, 5),
          inquiries: inquiries.slice(0, 5),
        },
        charts: {
          weeklyInquiries: [],
          monthlyProjects: [],
        },
      });
    }

    // Execute multiple count queries concurrently
    const [
      totalProjects,
      totalReviews,
      approvedReviews,
      pendingReviews,
      totalInquiries,
      unreadInquiries,
      totalMedia,
      totalAdmins,
    ] = await Promise.all([
      Project.countDocuments(),
      Review.countDocuments(),
      Review.countDocuments({ approved: true }),
      Review.countDocuments({ approved: false }),
      Inquiry.countDocuments(),
      Inquiry.countDocuments({ read: false }),
      Media.countDocuments(),
      Admin.countDocuments(),
    ]);

    // Fetch recent items (limit to 5 each)
    const [recentProjects, recentReviews, recentInquiries, recentLogs] = await Promise.all([
      Project.find().sort({ createdAt: -1 }).limit(5),
      Review.find().sort({ createdAt: -1 }).limit(5),
      Inquiry.find().sort({ createdAt: -1 }).limit(5),
      AuditLog.find().populate("admin", "username email role").sort({ timestamp: -1 }).limit(10),
    ]);

    // Fetch weekly inquiries data using Aggregation
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const inquiriesAggregation = await Inquiry.aggregate([
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Map aggregation results to the last 7 days
    const weeklyInquiries = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const match = inquiriesAggregation.find((a) => a._id === dateStr);
      weeklyInquiries.push({
        day: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        count: match ? match.count : 0
      });
    }

    res.json({
      stats: {
        totalProjects,
        totalReviews,
        approvedReviews,
        pendingReviews,
        totalInquiries,
        unreadInquiries,
        totalMedia,
        totalAdmins,
      },
      recentActivity: {
        projects: recentProjects,
        reviews: recentReviews,
        inquiries: recentInquiries,
        logs: recentLogs,
      },
      charts: {
        weeklyInquiries,
      },
    });
  } catch (error) {
    logger.error("Dashboard Stats Error: " + error.message);
    res.status(500).json({ error: "Failed to fetch dashboard statistics" });
  }
};
