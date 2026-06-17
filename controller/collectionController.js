const Collection = require("../models/Collection");
const Product = require("../models/Product");

// Reconcile which products belong to a collection: assign the selected ones,
// and detach any that were in this collection but are no longer selected.
async function syncProducts(userId, collectionId, productIds) {
  if (!Array.isArray(productIds)) return;
  if (productIds.length) {
    await Product.updateMany(
      { user: userId, _id: { $in: productIds } },
      { $set: { collectionId } }
    );
  }
  await Product.updateMany(
    { user: userId, collectionId, _id: { $nin: productIds } },
    { $set: { collectionId: null } }
  );
}

// GET /api/collections  — each collection with item count + value roll-up.
exports.list = async (req, res) => {
  try {
    const collections = await Collection.find({ user: req.user._id }).sort({
      createdAt: -1,
    });

    const rollups = await Product.aggregate([
      { $match: { user: req.user._id, collectionId: { $ne: null } } },
      {
        $group: {
          _id: "$collectionId",
          itemCount: { $sum: 1 },
          totalValue: { $sum: "$estimatedValue" },
        },
      },
    ]);

    const byId = {};
    rollups.forEach((r) => (byId[String(r._id)] = r));

    const result = collections.map((c) => {
      const r = byId[String(c._id)] || { itemCount: 0, totalValue: 0 };
      return {
        ...c.toObject(),
        itemCount: r.itemCount,
        totalValue: Math.round(r.totalValue * 100) / 100,
      };
    });

    return res.json(result);
  } catch (err) {
    console.error("collection list error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// POST /api/collections
exports.create = async (req, res) => {
  try {
    const { name, description, coverImage, productIds } = req.body;
    if (!name) return res.status(400).json({ message: "Name is required" });
    const collection = await Collection.create({
      user: req.user._id,
      name,
      description,
      coverImage,
    });
    await syncProducts(req.user._id, collection._id, productIds);
    return res
      .status(201)
      .json({ ...collection.toObject(), itemCount: productIds?.length || 0, totalValue: 0 });
  } catch (err) {
    console.error("collection create error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// PUT /api/collections/:id
exports.update = async (req, res) => {
  try {
    const { name, description, coverImage, productIds } = req.body;
    const collection = await Collection.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { $set: { name, description, coverImage } },
      { new: true }
    );
    if (!collection)
      return res.status(404).json({ message: "Collection not found" });
    await syncProducts(req.user._id, collection._id, productIds);
    return res.json(collection);
  } catch (err) {
    console.error("collection update error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// DELETE /api/collections/:id  — also detaches items from the collection.
exports.remove = async (req, res) => {
  try {
    const collection = await Collection.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!collection)
      return res.status(404).json({ message: "Collection not found" });

    await Product.updateMany(
      { user: req.user._id, collectionId: collection._id },
      { $set: { collectionId: null } }
    );
    return res.json({ message: "Collection deleted", id: req.params.id });
  } catch (err) {
    console.error("collection remove error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
