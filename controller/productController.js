const Product = require("../models/Product");
const Brand = require("../models/Brand");

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
  "images",
  "image",
  "brand",
  "invoiceAmount",
  "notes",
  "occasion",
  "purchasedFrom",
  "isGift",
  "purchaseDate",
  "giftedDate",
  "verified",
];

function pickWritable(body) {
  const out = {};
  for (const key of WRITABLE) {
    if (body[key] !== undefined) out[key] = body[key];
  }
  // Keep the primary thumbnail in sync with the gallery's first image.
  if (Array.isArray(out.images)) out.image = out.images[0] || "";
  // The dashboard/certificate roll-ups read estimatedValue — mirror the invoice.
  if (out.invoiceAmount !== undefined) {
    out.invoiceAmount = Number(out.invoiceAmount) || 0;
    out.estimatedValue = out.invoiceAmount;
  }
  if (typeof out.brand === "string") out.brand = out.brand.trim();
  return out;
}

// Auto-create the Brand doc so a newly-typed brand shows on the Brands page.
async function ensureBrand(userId, name) {
  const n = (name || "").trim();
  if (!n) return;
  await Brand.updateOne(
    { user: userId, name: n },
    { $setOnInsert: { user: userId, name: n } },
    { upsert: true }
  );
}

// GET /api/products?search=&metalType=&stoneType=&brand=&sort=
exports.list = async (req, res) => {
  try {
    const { search, metalType, stoneType, brand, sort } = req.query;
    const filter = { user: req.user._id };

    if (search) filter.name = { $regex: search.trim(), $options: "i" };
    if (metalType) filter.metalType = metalType;
    if (stoneType) filter.stoneType = stoneType;
    if (brand) filter.brand = brand;

    const sortMap = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      "value-high": { estimatedValue: -1 },
      "value-low": { estimatedValue: 1 },
      name: { name: 1 },
    };

    const products = await Product.find(filter).sort(
      sortMap[sort] || { createdAt: -1 }
    );
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
    });
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

    await ensureBrand(req.user._id, data.brand);
    const product = await Product.create({ ...data, user: req.user._id });
    return res.status(201).json(product);
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
    await ensureBrand(req.user._id, product.brand);

    await product.save();
    return res.json(product);
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
