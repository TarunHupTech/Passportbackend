const Product = require("../models/Product");
const Collection = require("../models/Collection");

// GET /api/dashboard — portfolio overview matching the prototype.
exports.overview = async (req, res) => {
  try {
    const userId = req.user._id;

    const [agg] = await Product.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: null,
          itemCount: { $sum: 1 },
          totalEstimatedValue: { $sum: "$estimatedValue" },
          totalResaleValue: { $sum: "$resaleValue" },
        },
      },
    ]);

    const [collectionsCount, mostValuable, recentItems] = await Promise.all([
      Collection.countDocuments({ user: userId }),
      Product.findOne({ user: userId })
        .sort({ estimatedValue: -1 })
        .populate("collectionId", "name"),
      Product.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(6)
        .populate("collectionId", "name"),
    ]);

    return res.json({
      itemCount: agg?.itemCount || 0,
      totalEstimatedValue: Math.round((agg?.totalEstimatedValue || 0) * 100) / 100,
      totalResaleValue: Math.round((agg?.totalResaleValue || 0) * 100) / 100,
      collectionsCount,
      mostValuableItem: mostValuable || null,
      recentItems,
    });
  } catch (err) {
    console.error("dashboard overview error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
