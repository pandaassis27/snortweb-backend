import Inquiry from "../models/Inquiry.js";

// In-Memory mock storage for inquiries
const mockInquiries = [
  {
    _id: "mock-inquiry-1",
    name: "Anish Sharma",
    email: "anish@alphatech.com",
    company: "Alpha Tech Solutions",
    service: "Security Testing & Analysis",
    budget: "₹1L–₹5L",
    message: "We need an external penetration testing and security audit done on our core banking web application. Please get in touch to discuss details.",
    read: false,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString() // 2 hours ago
  },
  {
    _id: "mock-inquiry-2",
    name: "Priya Patel",
    email: "priya@nexus.io",
    company: "Nexus E-Commerce",
    service: "Web App Development",
    budget: "₹5L+",
    message: "Looking to build a highly responsive and custom React e-commerce platform integrated with local payment APIs.",
    read: true,
    createdAt: new Date(Date.now() - 86400000).toISOString() // 1 day ago
  },
  {
    _id: "mock-inquiry-3",
    name: "Rahul Gupta",
    email: "rahul@guptaconsulting.com",
    company: "Gupta & Sons",
    service: "Website Development",
    budget: "₹50K–₹1L",
    message: "Hi, I am interested in building a high-speed corporate landing page with nice animations and modern design.",
    read: false,
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString() // 3 days ago
  }
];

// @desc    Get all inquiries
// @route   GET /api/inquiries
// @access  Private (Admin Only)
const getInquiries = async (req, res) => {
  if (process.env.USE_MOCK_DB === "true") {
    return res.json(mockInquiries);
  }

  try {
    const inquiries = await Inquiry.find({}).sort({ createdAt: -1 });
    return res.json(inquiries);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// @desc    Get single inquiry by ID
// @route   GET /api/inquiries/:id
// @access  Private (Admin Only)
const getInquiryById = async (req, res) => {
  if (process.env.USE_MOCK_DB === "true") {
    const inquiry = mockInquiries.find((i) => i._id === req.params.id);
    if (inquiry) {
      return res.json(inquiry);
    }
    return res.status(404).json({ error: "Inquiry not found" });
  }

  try {
    const inquiry = await Inquiry.findById(req.params.id);
    if (inquiry) {
      return res.json(inquiry);
    } else {
      return res.status(404).json({ error: "Inquiry not found" });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// @desc    Create a new inquiry
// @route   POST /api/inquiries
// @access  Public
const createInquiry = async (req, res) => {
  const { name, email, company, service, budget, message } = req.body;

  if (!name || !email || !service || !budget || !message) {
    return res.status(400).json({ error: "Name, email, service, budget, and message are required" });
  }

  if (process.env.USE_MOCK_DB === "true") {
    const newInquiry = {
      _id: `mock-inquiry-${Date.now()}`,
      name,
      email,
      company: company || "",
      service,
      budget,
      message,
      read: false,
      createdAt: new Date().toISOString()
    };
    mockInquiries.unshift(newInquiry);
    return res.status(201).json(newInquiry);
  }

  try {
    const inquiry = new Inquiry({
      name,
      email,
      company: company || "",
      service,
      budget,
      message,
    });

    const createdInquiry = await inquiry.save();
    return res.status(201).json(createdInquiry);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// @desc    Update inquiry status (read/unread)
// @route   PUT /api/inquiries/:id
// @access  Private (Admin Only)
const updateInquiryStatus = async (req, res) => {
  const { read } = req.body;

  if (read === undefined) {
    return res.status(400).json({ error: "Read status is required" });
  }

  if (process.env.USE_MOCK_DB === "true") {
    const inquiry = mockInquiries.find((i) => i._id === req.params.id);
    if (inquiry) {
      inquiry.read = read;
      return res.json(inquiry);
    }
    return res.status(404).json({ error: "Inquiry not found" });
  }

  try {
    const inquiry = await Inquiry.findById(req.params.id);

    if (inquiry) {
      inquiry.read = read;
      const updatedInquiry = await inquiry.save();
      return res.json(updatedInquiry);
    } else {
      return res.status(404).json({ error: "Inquiry not found" });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// @desc    Delete an inquiry
// @route   DELETE /api/inquiries/:id
// @access  Private (Admin Only)
const deleteInquiry = async (req, res) => {
  if (process.env.USE_MOCK_DB === "true") {
    const inquiryIndex = mockInquiries.findIndex((i) => i._id === req.params.id);
    if (inquiryIndex !== -1) {
      mockInquiries.splice(inquiryIndex, 1);
      return res.json({ message: "Inquiry removed successfully" });
    }
    return res.status(404).json({ error: "Inquiry not found" });
  }

  try {
    const inquiry = await Inquiry.findById(req.params.id);

    if (inquiry) {
      await inquiry.deleteOne();
      return res.json({ message: "Inquiry removed successfully" });
    } else {
      return res.status(404).json({ error: "Inquiry not found" });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export {
  getInquiries,
  getInquiryById,
  createInquiry,
  updateInquiryStatus,
  deleteInquiry,
};
