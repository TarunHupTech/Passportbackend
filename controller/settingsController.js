const Settings = require("../models/Settings");

// GET /api/settings — pricing rules used by the valuation engine.
exports.get = async (req, res) => {
  try {
    const settings = await Settings.getSingleton();
    return res.json(settings);
  } catch (err) {
    console.error("settings get error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
