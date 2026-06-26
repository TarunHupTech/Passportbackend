const Product = require("../models/Product");
const Brand = require("../models/Brand");

// GET /api/dashboard — portfolio overview.
exports.overview = async (req, res) => {
  try {
    const userId = req.user._id;

    const [agg] = await Product.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: null,
          itemCount: { $sum: 1 },
          totalInvoiceAmount: { $sum: "$estimatedValue" },
        },
      },
    ]);

    const [brandsCount, mostValuable, recentItems] = await Promise.all([
      Brand.countDocuments({ user: userId }),
      Product.findOne({ user: userId }).sort({ estimatedValue: -1 }),
      Product.find({ user: userId }).sort({ createdAt: -1 }).limit(6),
    ]);

    return res.json({
      itemCount: agg?.itemCount || 0,
      totalInvoiceAmount: Math.round((agg?.totalInvoiceAmount || 0) * 100) / 100,
      brandsCount,
      mostValuableItem: mostValuable || null,
      recentItems,
    });
  } catch (err) {
    console.error("dashboard overview error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
