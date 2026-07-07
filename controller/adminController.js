const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const User = require("../models/User");
const Product = require("../models/Product");
const Attribute = require("../models/Attribute");

const sign = (id) =>
  jwt.sign({ id, role: "admin" }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

const round = (n) => Math.round((n || 0) * 100) / 100;
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const PRICE_BUCKETS = [
  { label: "< 1K", key: 0 },
  { label: "1K–5K", key: 1000 },
  { label: "5K–10K", key: 5000 },
  { label: "10K–25K", key: 10000 },
  { label: "25K–50K", key: 25000 },
  { label: "50K–100K", key: 50000 },
  { label: "100K+", key: "100K+" },
];

// Build a continuous last-12-months series, anchored to the latest data month.
function buildMonthly(monthAgg) {
  const map = {};
  monthAgg.forEach((g) => {
    map[`${g._id.y}-${g._id.m}`] = { count: g.count, value: g.value };
  });
  let y, m;
  if (monthAgg.length) {
    const last = monthAgg[monthAgg.length - 1];
    y = last._id.y;
    m = last._id.m;
  } else {
    const now = new Date();
    y = now.getFullYear();
    m = now.getMonth() + 1;
  }
  const out = [];
  for (let i = 0; i < 12; i++) {
    const d = map[`${y}-${m}`] || { count: 0, value: 0 };
    out.unshift({
      label: `${MON[m - 1]} ${String(y).slice(2)}`,
      count: d.count,
      value: round(d.value),
    });
    m--;
    if (m === 0) {
      m = 12;
      y--;
    }
  }
  return out;
}

// POST /api/admin/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email and password are required" });
    const admin = await Admin.findOne({ email: String(email).toLowerCase() }).select(
      "+password"
    );
    if (!admin || !(await admin.matchPassword(password)))
      return res.status(401).json({ message: "Invalid email or password" });
    return res.json({
      token: sign(admin._id),
      admin: { name: admin.name, email: admin.email },
    });
  } catch (err) {
    console.error("admin login error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/admin/me
exports.me = async (req, res) =>
  res.json({ admin: { name: req.admin.name, email: req.admin.email } });

// GET /api/admin/analytics — cross-customer aggregates.
exports.analytics = async (req, res) => {
  try {
    const groupBy = (field) =>
      Product.aggregate([
        { $group: { _id: `$${field}`, count: { $sum: 1 }, value: { $sum: "$estimatedValue" } } },
        { $sort: { count: -1 } },
      ]);

    const [
      customers,
      items,
      totalAgg,
      giftCount,
      distinctBrands,
      typeAgg,
      metalAgg,
      stoneAgg,
      purityAgg,
      occasionAgg,
      brandAgg,
      bucketAgg,
      monthAgg,
      topCustomersAgg,
      recentAgg,
    ] = await Promise.all([
      User.countDocuments(),
      Product.countDocuments(),
      Product.aggregate([{ $group: { _id: null, total: { $sum: "$estimatedValue" } } }]),
      Product.countDocuments({ isGift: true }),
      Product.distinct("brand", { brand: { $nin: [null, ""] } }),
      groupBy("itemType"),
      groupBy("metalType"),
      groupBy("stoneType"),
      groupBy("purity"),
      Product.aggregate([
        { $match: { occasion: { $nin: [null, ""] } } },
        { $group: { _id: "$occasion", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      Product.aggregate([
        { $match: { brand: { $nin: [null, ""] } } },
        { $group: { _id: "$brand", count: { $sum: 1 }, value: { $sum: "$estimatedValue" } } },
        { $sort: { value: -1 } },
        { $limit: 8 },
      ]),
      Product.aggregate([
        {
          $bucket: {
            groupBy: "$estimatedValue",
            boundaries: [0, 1000, 5000, 10000, 25000, 50000, 100000],
            default: "100K+",
            output: { count: { $sum: 1 } },
          },
        },
      ]),
      Product.aggregate([
        {
          $group: {
            _id: { y: { $year: "$createdAt" }, m: { $month: "$createdAt" } },
            count: { $sum: 1 },
            value: { $sum: "$estimatedValue" },
          },
        },
        { $sort: { "_id.y": 1, "_id.m": 1 } },
      ]),
      Product.aggregate([
        { $group: { _id: "$user", items: { $sum: 1 }, value: { $sum: "$estimatedValue" } } },
        { $sort: { value: -1 } },
        { $limit: 8 },
        { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "u" } },
        { $unwind: { path: "$u", preserveNullAndEmptyArrays: true } },
        { $project: { _id: 0, name: "$u.name", email: "$u.email", items: 1, value: 1 } },
      ]),
      Product.find().sort({ createdAt: -1 }).limit(8).populate("user", "name").lean(),
    ]);

    const totalValue = round(totalAgg[0]?.total || 0);
    const fmt = (agg) =>
      agg.map((g) => ({ label: g._id || "—", count: g.count, value: round(g.value) }));

    const bucketMap = {};
    bucketAgg.forEach((b) => (bucketMap[b._id] = b.count));
    const priceBuckets = PRICE_BUCKETS.map((bk) => ({
      label: bk.label,
      count: bucketMap[bk.key] || 0,
    }));

    return res.json({
      totals: {
        customers,
        items,
        totalValue,
        avgValue: items ? round(totalValue / items) : 0,
        brands: distinctBrands.length,
        giftCount,
        giftPct: items ? Math.round((giftCount / items) * 100) : 0,
      },
      byItemType: fmt(typeAgg),
      byMetal: fmt(metalAgg),
      byStone: fmt(stoneAgg),
      byPurity: fmt(purityAgg),
      byOccasion: occasionAgg.map((g) => ({ label: g._id, count: g.count })),
      topBrands: brandAgg.map((g) => ({ label: g._id, count: g.count, value: round(g.value) })),
      giftSplit: { gift: giftCount, purchased: Math.max(0, items - giftCount) },
      priceBuckets,
      monthlyTrend: buildMonthly(monthAgg),
      topCustomers: topCustomersAgg.map((c) => ({
        name: c.name || "—",
        email: c.email || "—",
        items: c.items,
        value: round(c.value),
      })),
      recentItems: recentAgg.map((p) => ({
        name: p.name,
        brand: p.brand || "",
        itemType: p.itemType,
        value: p.invoiceAmount ?? p.estimatedValue ?? 0,
        customer: p.user?.name || "—",
        createdAt: p.createdAt,
      })),
    });
  } catch (err) {
    console.error("admin analytics error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// --- Attribute (option-list) management ----------------------------------

const attrPayload = (doc) => ({
  itemTypes: doc.itemTypes,
  metalTypes: doc.metalTypes,
  purities: doc.purities,
  stoneTypes: doc.stoneTypes,
});

// GET /api/admin/attributes
exports.getAttributes = async (req, res) => {
  try {
    const doc = await Attribute.getSingleton();
    return res.json(attrPayload(doc));
  } catch (err) {
    console.error("admin getAttributes error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// POST /api/admin/attributes/add  { category, value }
exports.addAttribute = async (req, res) => {
  try {
    const { category, value } = req.body;
    if (!Attribute.CATEGORIES.includes(category))
      return res.status(400).json({ message: "Invalid category" });
    const v = String(value || "").trim();
    if (!v) return res.status(400).json({ message: "Value is required" });

    const doc = await Attribute.getSingleton();
    if (doc[category].some((x) => x.toLowerCase() === v.toLowerCase()))
      return res.status(409).json({ message: "That option already exists" });

    doc[category].push(v);
    await doc.save();
    return res.json(attrPayload(doc));
  } catch (err) {
    console.error("admin addAttribute error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// POST /api/admin/attributes/remove  { category, value }
exports.removeAttribute = async (req, res) => {
  try {
    const { category, value } = req.body;
    if (!Attribute.CATEGORIES.includes(category))
      return res.status(400).json({ message: "Invalid category" });

    const doc = await Attribute.getSingleton();
    doc[category] = doc[category].filter((x) => x !== value);
    await doc.save();
    return res.json(attrPayload(doc));
  } catch (err) {
    console.error("admin removeAttribute error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
