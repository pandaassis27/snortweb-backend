import express from "express";
import { getMany, getOne, createOne, updateOne, deleteOne } from "../controllers/crudController.js";
import Partner from "../models/Partner.js";
import { protect, admin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.route("/")
  .get(getMany(Partner))
  .post(protect, admin, createOne(Partner));

router.route("/:id")
  .get(getOne(Partner))
  .put(protect, admin, updateOne(Partner))
  .delete(protect, admin, deleteOne(Partner));

export default router;
