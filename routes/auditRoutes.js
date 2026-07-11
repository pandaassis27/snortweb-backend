import express from "express";
import { getAuditLogs } from "../controllers/auditController.js";
import { protect, superadmin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.route("/").get(protect, superadmin, getAuditLogs);

export default router;
