import Project from "../models/Project.js";
import { readData, writeData } from "../config/localDb.js";
import { logAudit } from "../utils/auditLogger.js";
import logger from "../config/logger.js";

const FILE_NAME = "projects.json";

// Safe ObjectId verification
const isValidId = (id) => {
  if (process.env.USE_MOCK_DB === "true") {
    return /^[a-zA-Z0-9-]+$/.test(id);
  }
  return /^[0-9a-fA-F]{24}$/.test(id);
};

// Safe URL protocol verification
const isValidSafeUrl = (url) => {
  if (!url || url === "#" || url.trim() === "") return true;
  const lowerUrl = url.toLowerCase().trim();
  // Prevent dangerous protocols
  if (
    lowerUrl.startsWith("javascript:") ||
    lowerUrl.startsWith("data:") ||
    lowerUrl.startsWith("file:")
  ) {
    return false;
  }
  // Require standard web protocol (http or https)
  return /^https?:\/\//i.test(lowerUrl);
};

// @desc    Get all projects
// @route   GET /api/projects
// @access  Public
const getProjects = async (req, res) => {
  if (process.env.USE_MOCK_DB === "true") {
    const mockProjects = readData(FILE_NAME);
    return res.json(mockProjects);
  }

  try {
    const { paginate, page = 1, limit = 10, search, category, sortBy = "createdAt", sortOrder = "desc" } = req.query;
    const isPaginated = paginate === "true";

    const query = {};
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { tags: { $regex: search, $options: "i" } }
      ];
    }
    if (category && category !== "All") {
      query.category = category;
    }

    const sortConfig = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    if (!isPaginated) {
      const projects = await Project.find(query).sort(sortConfig);
      return res.json(projects);
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const [projects, total] = await Promise.all([
      Project.find(query).sort(sortConfig).skip(skip).limit(limitNum),
      Project.countDocuments(query)
    ]);

    return res.json({
      data: projects,
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum)
    });
  } catch (error) {
    logger.error("Error in getProjects: " + error.message);
    return res.status(500).json({ error: "An error occurred while fetching projects." });
  }
};

// @desc    Get single project by ID
// @route   GET /api/projects/:id
// @access  Public
const getProjectById = async (req, res) => {
  const { id } = req.params;

  if (!isValidId(id)) {
    return res.status(400).json({ error: "Invalid project ID format." });
  }

  if (process.env.USE_MOCK_DB === "true") {
    const mockProjects = readData(FILE_NAME);
    const project = mockProjects.find((p) => p._id === id);
    if (project) {
      return res.json(project);
    }
    return res.status(404).json({ error: "Project not found" });
  }

  try {
    const project = await Project.findById(id);
    if (project) {
      return res.json(project);
    } else {
      return res.status(404).json({ error: "Project not found" });
    }
  } catch (error) {

    await logAudit({
      req,
      action: "CREATE",
      resource: "PROJECT",
      status: "failed",
      details: {
        reason: error.message,
      },
    });

    return res.status(500).json({
      error: "An error occurred while creating the project."
    });
  }
}

// @desc    Create a project
// @route   POST /api/projects
// @access  Private (Admin Only)
const createProject = async (req, res) => {
  console.log("========== PROJECT BODY ==========");
  console.log(req.body);
  const { title, description, category, tags, imageUrl, liveUrl, githubUrl } = req.body;

  if (!title || !description || !category) {
    return res.status(400).json({ error: "Title, description, and category are required" });
  }

  // Input length and character type validation
  const cleanTitle = String(title).trim();
  const cleanDesc = String(description).trim();
  const cleanCat = String(category).trim();

  if (cleanTitle.length < 3 || cleanTitle.length > 100) {
    return res.status(400).json({ error: "Title must be between 3 and 100 characters." });
  }

  if (cleanDesc.length < 10 || cleanDesc.length > 2000) {
    return res.status(400).json({ error: "Description must be between 10 and 2000 characters." });
  }

  if (imageUrl !== undefined && !isValidSafeUrl(imageUrl)) {
    return res.status(400).json({ error: "Invalid Image URL provided. Must be a safe web link (http/https) or left empty." });
  }
  if (liveUrl !== undefined && !isValidSafeUrl(liveUrl)) {
    return res.status(400).json({ error: "Invalid Live Production URL provided. Must be a safe web link (http/https) or left empty." });
  }
  if (githubUrl !== undefined && !isValidSafeUrl(githubUrl)) {
    return res.status(400).json({ error: "Invalid GitHub URL provided. Must be a safe web link (http/https) or left empty." });
  }

  // Ensure tags is an array of alphanumeric strings
  let cleanTags = [];
  if (Array.isArray(tags)) {
    cleanTags = tags.map(tag => String(tag).trim()).filter(tag => /^[a-zA-Z0-9\s#+-.]+$/.test(tag) && tag.length <= 30);
  }

  if (process.env.USE_MOCK_DB === "true") {
    const mockProjects = readData(FILE_NAME);
    const newProject = {
      _id: `mock-project-${Date.now()}`,
      title: cleanTitle,
      description: cleanDesc,
      category: cleanCat,
      tags: cleanTags,
      imageUrl: imageUrl || "",
      liveUrl: liveUrl || "",
      githubUrl: githubUrl || "",
      createdAt: new Date().toISOString()
    };
    mockProjects.unshift(newProject);
    writeData(FILE_NAME, mockProjects);
    return res.status(201).json(newProject);
  }

  try {
    const project = new Project({
      title: cleanTitle,
      description: cleanDesc,
      category: cleanCat,
      tags: cleanTags,
      imageUrl: imageUrl || "",
      liveUrl: liveUrl || "",
      githubUrl: githubUrl || "",
    });

    const createdProject = await project.save();
    return res.status(201).json(createdProject);
  } catch (error) {
    return res.status(500).json({ error: "An error occurred while creating the project." });
  }
};

// @desc    Update a project
// @route   PUT /api/projects/:id
// @access  Private (Admin Only)
const updateProject = async (req, res) => {
  const { id } = req.params;
  const { title, description, category, tags, imageUrl, liveUrl, githubUrl } = req.body;

  if (!isValidId(id)) {
    return res.status(400).json({ error: "Invalid project ID format." });
  }

  // Input validation
  if (title !== undefined && (String(title).trim().length < 3 || String(title).trim().length > 100)) {
    return res.status(400).json({ error: "Title must be between 3 and 100 characters." });
  }

  if (description !== undefined && (String(description).trim().length < 10 || String(description).trim().length > 2000)) {
    return res.status(400).json({ error: "Description must be between 10 and 2000 characters." });
  }

  if (imageUrl !== undefined && !isValidSafeUrl(imageUrl)) {
    return res.status(400).json({ error: "Invalid Image URL provided. Must be a safe web link (http/https) or left empty." });
  }
  if (liveUrl !== undefined && !isValidSafeUrl(liveUrl)) {
    return res.status(400).json({ error: "Invalid Live Production URL provided. Must be a safe web link (http/https) or left empty." });
  }
  if (githubUrl !== undefined && !isValidSafeUrl(githubUrl)) {
    return res.status(400).json({ error: "Invalid GitHub URL provided. Must be a safe web link (http/https) or left empty." });
  }

  let cleanTags = tags;
  if (tags !== undefined && Array.isArray(tags)) {
    cleanTags = tags.map(tag => String(tag).trim()).filter(tag => /^[a-zA-Z0-9\s#+-.]+$/.test(tag) && tag.length <= 30);
  }

  if (process.env.USE_MOCK_DB === "true") {
    const mockProjects = readData(FILE_NAME);
    const project = mockProjects.find((p) => p._id === id);
    if (project) {
      project.title = title !== undefined ? String(title).trim() : project.title;
      project.description = description !== undefined ? String(description).trim() : project.description;
      project.category = category !== undefined ? String(category).trim() : project.category;
      project.tags = cleanTags !== undefined ? cleanTags : project.tags;
      project.imageUrl = imageUrl !== undefined ? imageUrl : project.imageUrl;
      project.liveUrl = liveUrl !== undefined ? liveUrl : project.liveUrl;
      project.githubUrl = githubUrl !== undefined ? githubUrl : project.githubUrl;

      writeData(FILE_NAME, mockProjects);
      return res.json(project);
    }
    return res.status(404).json({ error: "Project not found" });
  }

  try {
    const project = await Project.findById(id);

    if (project) {
      project.title = title !== undefined ? String(title).trim() : project.title;
      project.description = description !== undefined ? String(description).trim() : project.description;
      project.category = category !== undefined ? String(category).trim() : project.category;
      project.tags = cleanTags !== undefined ? cleanTags : project.tags;
      project.imageUrl = imageUrl !== undefined ? imageUrl : project.imageUrl;
      project.liveUrl = liveUrl !== undefined ? liveUrl : project.liveUrl;
      project.githubUrl = githubUrl !== undefined ? githubUrl : project.githubUrl;

      const updatedProject = await project.save();
      return res.json(updatedProject);
    } else {
      return res.status(404).json({ error: "Project not found" });
    }
  } catch (error) {
    return res.status(500).json({ error: "An error occurred while updating the project." });
  }
};

// @desc    Delete a project
// @route   DELETE /api/projects/:id
// @access  Private (Admin Only)
const deleteProject = async (req, res) => {
  const { id } = req.params;

  if (!isValidId(id)) {
    return res.status(400).json({ error: "Invalid project ID format." });
  }

  if (process.env.USE_MOCK_DB === "true") {
    const mockProjects = readData(FILE_NAME);
    const projectIndex = mockProjects.findIndex((p) => p._id === id);
    if (projectIndex !== -1) {
      const removedProject = mockProjects.splice(projectIndex, 1)[0];
      writeData(FILE_NAME, mockProjects);
      return res.json({ message: "Project removed successfully", project: removedProject });
    }
    return res.status(404).json({ error: "Project not found" });
  }

  try {
    const project = await Project.findById(id);

    if (project) {
      await project.deleteOne();
      return res.json({ message: "Project removed successfully" });
    } else {
      return res.status(404).json({ error: "Project not found" });
    }
  } catch (error) {
    return res.status(500).json({ error: "An error occurred while deleting the project." });
  }
};

// @desc    Bulk delete projects
// @route   POST /api/projects/bulk-delete
// @access  Private (SuperAdmin)
const bulkDeleteProjects = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "No project IDs provided for deletion." });
    }

    // Validate IDs
    for (const id of ids) {
      if (!isValidId(id)) return res.status(400).json({ error: `Invalid ID format: ${id}` });
    }

    if (process.env.USE_MOCK_DB === "true") {
      let mockProjects = readData(FILE_NAME);
      const initialLength = mockProjects.length;
      mockProjects = mockProjects.filter((p) => !ids.includes(p._id));
      writeData(FILE_NAME, mockProjects);
      const deletedCount = initialLength - mockProjects.length;
      
      logAudit({
        req,
        action: "BULK_DELETE_PROJECTS",
        resource: "PROJECT",
        status: "success",
        details: { deletedCount, ids },
      });
      return res.json({ message: `${deletedCount} projects deleted successfully.` });
    }

    const result = await Project.deleteMany({ _id: { $in: ids } });

    logAudit({
      req,
      action: "BULK_DELETE_PROJECTS",
      resource: "PROJECT",
      status: "success",
      details: { deletedCount: result.deletedCount, ids },
    });

    return res.json({ message: `${result.deletedCount} projects deleted successfully.` });
  } catch (error) {
    logger.error("Error in bulkDeleteProjects: " + error.message);
    logAudit({
      req,
      action: "BULK_DELETE_PROJECTS",
      resource: "PROJECT",
      status: "failed",
      details: { error: error.message },
    });
    return res.status(500).json({ error: "An error occurred while bulk deleting projects." });
  }
};

export {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  bulkDeleteProjects,
};
