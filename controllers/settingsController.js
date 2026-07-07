import Setting from "../models/Setting.js";

// @desc    Get global settings
// @route   GET /api/settings
// @access  Public
export const getSettings = async (req, res) => {
  try {
    let settings = await Setting.findOne();
    if (!settings) {
      // Create default if none exists
      settings = await Setting.create({ socialLinks: [] });
    }
    res.json(settings);
  } catch (error) {
    console.error("Error in getSettings:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Update global settings
// @route   PUT /api/settings
// @access  Private (Admin only)
export const updateSettings = async (req, res) => {
  try {
    const { socialLinks } = req.body;

    let settings = await Setting.findOne();
    if (!settings) {
      settings = new Setting();
    }

    if (socialLinks !== undefined) {
      settings.socialLinks = socialLinks;
    }

    const updatedSettings = await settings.save();
    res.json(updatedSettings);
  } catch (error) {
    console.error("Error in updateSettings:", error);
    res.status(500).json({ message: "Server error" });
  }
};
