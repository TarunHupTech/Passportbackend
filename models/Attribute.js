const mongoose = require("mongoose");

// Admin-managed option lists that drive the customer product form.
const attributeSchema = new mongoose.Schema(
  {
    key: { type: String, default: "default", unique: true },
    itemTypes: { type: [String], default: [] },
    metalTypes: { type: [String], default: [] },
    purities: { type: [String], default: [] },
    stoneTypes: { type: [String], default: [] },
  },
  { timestamps: true }
);

// The valid category keys a client may manage.
attributeSchema.statics.CATEGORIES = ["itemTypes", "metalTypes", "purities", "stoneTypes"];

const DEFAULTS = {
  itemTypes: ["Necklace", "Ring", "Earrings", "Bracelet", "Bangle", "Pendant", "Chain", "Other"],
  metalTypes: ["Gold", "Rose Gold", "White Gold", "Silver", "Platinum"],
  purities: ["24k", "22k", "21k", "18k", "14k", "925"],
  stoneTypes: ["None", "Diamond", "Ruby", "Emerald", "Sapphire", "Pearl", "Other"],
};

attributeSchema.statics.getSingleton = async function () {
  let doc = await this.findOne({ key: "default" });
  if (!doc) doc = await this.create({ key: "default", ...DEFAULTS });
  return doc;
};

module.exports = mongoose.model("Attribute", attributeSchema);
