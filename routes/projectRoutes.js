import express from "express";
import {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  bulkDeleteProjects,
} from "../controllers/projectController.js";
import { protect, admin, superadmin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.route("/bulk-delete").post(protect, superadmin, bulkDeleteProjects);
router.route("/").get(getProjects).post(protect, admin, createProject);
router.route("/:id").get(getProjectById).put(protect, admin, updateProject).delete(protect, admin, deleteProject);

export default router;
