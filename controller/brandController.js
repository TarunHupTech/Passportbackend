const Brand = require("../models/Brand");
const Product = require("../models/Product");

// Sync which products belong to a brand by name.
// Selected products get brand=finalName; previously-in-brand products that were
// deselected get brand="".
async function syncProducts(userId, finalName, productIds) {
  const ids = Array.isArray(productIds) ? productIds : [];
  // 1) Detach anything currently in this brand that is no longer selected.
  await Product.updateMany(
    { user: userId, brand: finalName, _id: { $nin: ids } },
    { $set: { brand: "" } }
  );
  // 2) Attach the selected items to this brand.
  if (ids.length) {
    await Product.updateMany(
      { _id: { $in: ids }, user: userId },
      { $set: { brand: finalName } }
    );
  }
}

// GET /api/brands — each brand with item count + total invoice value.
exports.list = async (req, res) => {
  try {
    const brands = await Brand.find({ user: req.user._id }).sort({ createdAt: -1 });

    const rollups = await Product.aggregate([
      { $match: { user: req.user._id, brand: { $ne: "" } } },
      {
        $group: {
          _id: "$brand",
          itemCount: { $sum: 1 },
          totalValue: { $sum: "$estimatedValue" },
        },
      },
    ]);
    const byName = {};
    rollups.forEach((r) => (byName[r._id] = r));

    const result = brands.map((b) => {
      const r = byName[b.name] || { itemCount: 0, totalValue: 0 };
      return {
        ...b.toObject(),
        itemCount: r.itemCount,
        totalValue: Math.round(r.totalValue * 100) / 100,
      };
    });
    return res.json(result);
  } catch (err) {
    console.error("brand list error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// POST /api/brands
exports.create = async (req, res) => {
  try {
    const { name, description, coverImage, productIds } = req.body;
    if (!name || !name.trim())
      return res.status(400).json({ message: "Name is required" });
    const finalName = name.trim();
    const brand = await Brand.create({
      user: req.user._id,
      name: finalName,
      description,
      coverImage,
    });
    if (productIds !== undefined) {
      await syncProducts(req.user._id, finalName, productIds);
    }
    const itemCount = Array.isArray(productIds) ? productIds.length : 0;
    return res.status(201).json({ ...brand.toObject(), itemCount, totalValue: 0 });
  } catch (err) {
    if (err.code === 11000)
      return res.status(409).json({ message: "That brand already exists" });
    console.error("brand create error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// PUT /api/brands/:id — renaming cascades; productIds syncs membership.
exports.update = async (req, res) => {
  try {
    const { name, description, coverImage, productIds } = req.body;
    const brand = await Brand.findOne({ _id: req.params.id, user: req.user._id });
    if (!brand) return res.status(404).json({ message: "Brand not found" });

    const newName = (name || brand.name).trim();

    // Rename cascade (old → new) before sync so syncProducts sees the new name.
    if (newName !== brand.name) {
      await Product.updateMany(
        { user: req.user._id, brand: brand.name },
        { $set: { brand: newName } }
      );
    }

    brand.name = newName;
    if (description !== undefined) brand.description = description;
    if (coverImage !== undefined) brand.coverImage = coverImage;
    await brand.save();

    if (productIds !== undefined) {
      await syncProducts(req.user._id, newName, productIds);
    }

    return res.json(brand);
  } catch (err) {
    if (err.code === 11000)
      return res.status(409).json({ message: "That brand already exists" });
    console.error("brand update error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// DELETE /api/brands/:id — items keep, but their brand is cleared.
exports.remove = async (req, res) => {
  try {
    const brand = await Brand.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!brand) return res.status(404).json({ message: "Brand not found" });
    await Product.updateMany(
      { user: req.user._id, brand: brand.name },
      { $set: { brand: "" } }
    );
    return res.json({ message: "Brand deleted", id: req.params.id });
  } catch (err) {
    console.error("brand remove error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
