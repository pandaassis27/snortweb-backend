import Project from "../models/Project.js";

// In-Memory mock storage for projects
const mockProjects = [
  {
    _id: "mock-project-1",
    title: "Hotel Reyansh Pride",
    description: "A premium signature cafe & dine-in experience interface designed with custom booking, menu customization, and sleek order analytics.",
    category: "Dine & Cafe",
    tags: ["React", "Tailwind CSS", "Node.js", "Express"],
    imageUrl: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=800&q=80",
    createdAt: new Date().toISOString()
  },
  {
    _id: "mock-project-2",
    title: "Reyansh Heights Real Estate",
    description: "Next-gen real estate platform featuring high-fidelity architectural showcases, dynamic virtual tours, and a secure client portal.",
    category: "Real Estate",
    tags: ["React", "Three.js", "MongoDB", "Tailwind CSS"],
    imageUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
    createdAt: new Date(Date.now() - 86400000).toISOString()
  },
  {
    _id: "mock-project-3",
    title: "Packzivo Packaging",
    description: "Custom bulk packaging builder and supply chain logistics tracker tailored for premium eco-friendly shipping materials.",
    category: "Logistics & Supply",
    tags: ["React", "Framer Motion", "Node.js", "PostgreSQL"],
    imageUrl: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=800&q=80",
    createdAt: new Date(Date.now() - 172800000).toISOString()
  }
];

// @desc    Get all projects
// @route   GET /api/projects
// @access  Public
const getProjects = async (req, res) => {
  if (process.env.USE_MOCK_DB === "true") {
    return res.json(mockProjects);
  }

  try {
    const projects = await Project.find({}).sort({ createdAt: -1 });
    return res.json(projects);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// @desc    Get single project by ID
// @route   GET /api/projects/:id
// @access  Public
const getProjectById = async (req, res) => {
  if (process.env.USE_MOCK_DB === "true") {
    const project = mockProjects.find((p) => p._id === req.params.id);
    if (project) {
      return res.json(project);
    }
    return res.status(404).json({ error: "Project not found" });
  }

  try {
    const project = await Project.findById(req.params.id);
    if (project) {
      return res.json(project);
    } else {
      return res.status(404).json({ error: "Project not found" });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// @desc    Create a project
// @route   POST /api/projects
// @access  Private (Admin Only)
const createProject = async (req, res) => {
  const { title, description, category, tags, imageUrl, liveUrl, githubUrl } = req.body;

  if (!title || !description || !category) {
    return res.status(400).json({ error: "Title, description, and category are required" });
  }

  if (process.env.USE_MOCK_DB === "true") {
    const newProject = {
      _id: `mock-project-${Date.now()}`,
      title,
      description,
      category,
      tags: tags || [],
      imageUrl: imageUrl || "",
      liveUrl: liveUrl || "",
      githubUrl: githubUrl || "",
      createdAt: new Date().toISOString()
    };
    mockProjects.unshift(newProject);
    return res.status(201).json(newProject);
  }

  try {
    const project = new Project({
      title,
      description,
      category,
      tags: tags || [],
      imageUrl: imageUrl || "",
      liveUrl: liveUrl || "",
      githubUrl: githubUrl || "",
    });

    const createdProject = await project.save();
    return res.status(201).json(createdProject);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// @desc    Update a project
// @route   PUT /api/projects/:id
// @access  Private (Admin Only)
const updateProject = async (req, res) => {
  const { title, description, category, tags, imageUrl, liveUrl, githubUrl } = req.body;

  if (process.env.USE_MOCK_DB === "true") {
    const project = mockProjects.find((p) => p._id === req.params.id);
    if (project) {
      project.title = title || project.title;
      project.description = description || project.description;
      project.category = category || project.category;
      project.tags = tags || project.tags;
      project.imageUrl = imageUrl !== undefined ? imageUrl : project.imageUrl;
      project.liveUrl = liveUrl !== undefined ? liveUrl : project.liveUrl;
      project.githubUrl = githubUrl !== undefined ? githubUrl : project.githubUrl;
      return res.json(project);
    }
    return res.status(404).json({ error: "Project not found" });
  }

  try {
    const project = await Project.findById(req.params.id);

    if (project) {
      project.title = title || project.title;
      project.description = description || project.description;
      project.category = category || project.category;
      project.tags = tags || project.tags;
      project.imageUrl = imageUrl !== undefined ? imageUrl : project.imageUrl;
      project.liveUrl = liveUrl !== undefined ? liveUrl : project.liveUrl;
      project.githubUrl = githubUrl !== undefined ? githubUrl : project.githubUrl;

      const updatedProject = await project.save();
      return res.json(updatedProject);
    } else {
      return res.status(404).json({ error: "Project not found" });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// @desc    Delete a project
// @route   DELETE /api/projects/:id
// @access  Private (Admin Only)
const deleteProject = async (req, res) => {
  if (process.env.USE_MOCK_DB === "true") {
    const projectIndex = mockProjects.findIndex((p) => p._id === req.params.id);
    if (projectIndex !== -1) {
      mockProjects.splice(projectIndex, 1);
      return res.json({ message: "Project removed successfully" });
    }
    return res.status(404).json({ error: "Project not found" });
  }

  try {
    const project = await Project.findById(req.params.id);

    if (project) {
      await project.deleteOne();
      return res.json({ message: "Project removed successfully" });
    } else {
      return res.status(404).json({ error: "Project not found" });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
};
