const Attribute = require("../models/Attribute");

// GET /api/attributes — current option lists for the customer product form.
exports.get = async (req, res) => {
  try {
    const doc = await Attribute.getSingleton();
    return res.json({
      itemTypes: doc.itemTypes,
      metalTypes: doc.metalTypes,
      purities: doc.purities,
      stoneTypes: doc.stoneTypes,
    });
  } catch (err) {
    console.error("attributes get error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
