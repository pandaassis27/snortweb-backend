// @desc    Create a new inquiry
// @route   POST /api/inquiries
// @access  Public
const createInquiry = async (req, res) => {
  const { name, email, company, service, budget, message } = req.body;

  if (!name || !email || !service || !budget || message === undefined) {
    return res.status(400).json({
      error: "Name, email, service, budget, and message are required",
    });
  }

  // Clean Input
  const cleanName = String(name).trim();
  const cleanEmail = String(email).trim();
  const cleanCompany = company ? String(company).trim() : "";
  const cleanService = String(service).trim();
  const cleanBudget = String(budget).trim();
  const cleanMessage = String(message).trim();

  // Name Validation
  if (cleanName.length < 2 || cleanName.length > 50) {
    return res.status(400).json({
      error: "Name must be between 2 and 50 characters.",
    });
  }

  // Email Validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail) || cleanEmail.length > 100) {
    return res.status(400).json({
      error: "Please enter a valid email address.",
    });
  }

  // Company Validation
  if (cleanCompany.length > 100) {
    return res.status(400).json({
      error: "Company name must not exceed 100 characters.",
    });
  }

  // Service Validation
  if (cleanService.length < 2 || cleanService.length > 100) {
    return res.status(400).json({
      error: "Service choice must be between 2 and 100 characters.",
    });
  }

  // Budget Validation
  if (cleanBudget.length < 2 || cleanBudget.length > 50) {
    return res.status(400).json({
      error: "Budget field must be between 2 and 50 characters.",
    });
  }

  // Message Validation
  if (!cleanMessage) {
    return res.status(400).json({
      error: "Message is required.",
    });
  }

  if (cleanMessage.length > 3000) {
    return res.status(400).json({
      error: "Message cannot exceed 3000 characters.",
    });
  }

  // Mock Database
  if (process.env.USE_MOCK_DB === "true") {
    const mockInquiries = readData(FILE_NAME);

    const newInquiry = {
      _id: `mock-inquiry-${Date.now()}`,
      name: cleanName,
      email: cleanEmail,
      company: cleanCompany,
      service: cleanService,
      budget: cleanBudget,
      message: cleanMessage,
      read: false,
      createdAt: new Date().toISOString(),
    };

    mockInquiries.unshift(newInquiry);
    writeData(FILE_NAME, mockInquiries);

    return res.status(201).json(newInquiry);
  }

  // MongoDB
  try {
    const inquiry = new Inquiry({
      name: cleanName,
      email: cleanEmail,
      company: cleanCompany,
      service: cleanService,
      budget: cleanBudget,
      message: cleanMessage,
    });

    const createdInquiry = await inquiry.save();

    return res.status(201).json(createdInquiry);
  } catch (error) {
    console.error("Inquiry Save Error:", error);

    return res.status(500).json({
      error: "An error occurred while submitting the inquiry.",
    });
  }
};