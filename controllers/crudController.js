// A generic CRUD controller factory for standard models

const getErrorMsg = (error) => process.env.NODE_ENV === "production" ? "Database operation failed" : error.message;

export const getMany = (Model) => async (req, res) => {
  try {
    const docs = await Model.find().sort({ order: 1, createdAt: -1 });
    res.json(docs);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: getErrorMsg(error) });
  }
};

export const getOne = (Model) => async (req, res) => {
  try {
    const doc = await Model.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: getErrorMsg(error) });
  }
};

export const createOne = (Model) => async (req, res) => {
  try {
    const doc = await Model.create(req.body);
    res.status(201).json(doc);
  } catch (error) {
    res.status(400).json({ message: "Invalid data", error: getErrorMsg(error) });
  }
};

export const updateOne = (Model) => async (req, res) => {
  try {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (error) {
    res.status(400).json({ message: "Invalid data", error: getErrorMsg(error) });
  }
};

export const deleteOne = (Model) => async (req, res) => {
  try {
    const doc = await Model.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: getErrorMsg(error) });
  }
};
