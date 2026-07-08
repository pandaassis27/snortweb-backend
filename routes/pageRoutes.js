import express from "express";
import { getMany, getOne, createOne, updateOne, deleteOne } from "../controllers/crudController.js";
import PageContent from "../models/PageContent.js";
import { protect, admin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.route("/")
  .get(getMany(PageContent))
  .post(protect, admin, createOne(PageContent));

router.route("/:id")
  .get(getOne(PageContent))
  .put(protect, admin, updateOne(PageContent))
  .delete(protect, admin, deleteOne(PageContent));

// Custom route to get a page by pageName
router.get("/name/:pageName", async (req, res) => {
  try {
    const doc = await PageContent.findOne({ pageName: req.params.pageName });
    if (!doc) return res.status(404).json({ message: "Page not found" });
    res.json(doc);
  } catch (error) {
    const errorMsg = process.env.NODE_ENV === "production" ? "Database operation failed" : error.message;
    res.status(500).json({ message: "Server error", error: errorMsg });
  }
});

export default router;
