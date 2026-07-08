import express from "express";
import { getMany, getOne, createOne, updateOne, deleteOne } from "../controllers/crudController.js";
import Blog from "../models/Blog.js";
import { protect, admin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.route("/")
  .get(getMany(Blog))
  .post(protect, admin, createOne(Blog));

router.route("/:id")
  .get(getOne(Blog))
  .put(protect, admin, updateOne(Blog))
  .delete(protect, admin, deleteOne(Blog));

export default router;
