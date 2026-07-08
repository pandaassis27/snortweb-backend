import express from "express";
import { getMany, getOne, createOne, updateOne, deleteOne } from "../controllers/crudController.js";
import Service from "../models/Service.js";
import { protect, admin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.route("/")
  .get(getMany(Service))
  .post(protect, admin, createOne(Service));

router.route("/:id")
  .get(getOne(Service))
  .put(protect, admin, updateOne(Service))
  .delete(protect, admin, deleteOne(Service));

export default router;
