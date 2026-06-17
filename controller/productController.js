const Product = require("../models/Product");
const Settings = require("../models/Settings");
const { valueItem } = require("../utils/valuation");

// Fields a client is allowed to set on a product.
const WRITABLE = [
  "name",
  "itemType",
  "metalType",
  "purity",
  "netWeight",
  "grossWeight",
  "stoneType",
  "stoneWeight",
  "makingCharges",
  "images",
  "image",
  "collectionId",
  "notes",
  "purchasedFrom",
  "purchaseDate",
  "verified",
];

function pickWritable(body) {
  const out = {};
  for (const key of WRITABLE) {
    if (body[key] !== undefined) out[key] = body[key];
  }
  // An empty collection string means "no collection".
  if (out.collectionId === "" || out.collectionId === "null")
    out.collectionId = null;
  // Keep the primary thumbnail in sync with the gallery's first image.
  if (Array.isArray(out.images)) out.image = out.images[0] || "";
  return out;
}

// GET /api/products?search=&metalType=&stoneType=&collection=&sort=
exports.list = async (req, res) => {
  try {
    const { search, metalType, stoneType, collectionId, sort } = req.query;
    const filter = { user: req.user._id };

    if (search) filter.name = { $regex: search.trim(), $options: "i" };
    if (metalType) filter.metalType = metalType;
    if (stoneType) filter.stoneType = stoneType;
    if (collectionId) filter.collectionId = collectionId;

    const sortMap = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      "value-high": { estimatedValue: -1 },
      "value-low": { estimatedValue: 1 },
      name: { name: 1 },
    };

    const products = await Product.find(filter)
      .populate("collectionId", "name")
      .sort(sortMap[sort] || { createdAt: -1 });

    return res.json(products);
  } catch (err) {
    console.error("product list error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/products/:id
exports.getOne = async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      user: req.user._id,
    }).populate("collectionId", "name");
    if (!product) return res.status(404).json({ message: "Item not found" });
    return res.json(product);
  } catch (err) {
    console.error("product getOne error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// POST /api/products
exports.create = async (req, res) => {
  try {
    const data = pickWritable(req.body);
    if (!data.name) return res.status(400).json({ message: "Name is required" });

    const settings = await Settings.getSingleton();
    const valuation = valueItem(data, settings);

    const product = await Product.create({
      ...data,
      ...valuation,
      user: req.user._id,
    });
    const populated = await product.populate("collectionId", "name");
    return res.status(201).json(populated);
  } catch (err) {
    console.error("product create error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// PUT /api/products/:id
exports.update = async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!product) return res.status(404).json({ message: "Item not found" });

    const data = pickWritable(req.body);
    Object.assign(product, data);

    const settings = await Settings.getSingleton();
    Object.assign(product, valueItem(product, settings));

    await product.save();
    const populated = await product.populate("collectionId", "name");
    return res.json(populated);
  } catch (err) {
    console.error("product update error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// DELETE /api/products/:id
exports.remove = async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!product) return res.status(404).json({ message: "Item not found" });
    return res.json({ message: "Item deleted", id: req.params.id });
  } catch (err) {
    console.error("product remove error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
