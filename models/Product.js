const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    itemType: {
      type: String,
      enum: [
        "Necklace",
        "Ring",
        "Earrings",
        "Bracelet",
        "Bangle",
        "Pendant",
        "Chain",
        "Other",
      ],
      default: "Other",
    },
    metalType: {
      type: String,
      enum: ["Gold", "Rose Gold", "White Gold", "Silver", "Platinum"],
      default: "Gold",
    },
    purity: {
      type: String,
      enum: ["24k", "22k", "21k", "18k", "14k", "925"],
      default: "22k",
    },
    netWeight: { type: Number, default: 0, min: 0 }, // grams
    grossWeight: { type: Number, default: 0, min: 0 }, // grams
    stoneType: {
      type: String,
      enum: ["None", "Diamond", "Ruby", "Emerald", "Sapphire", "Pearl", "Other"],
      default: "None",
    },
    stoneWeight: { type: Number, default: 0, min: 0 }, // carat
    makingCharges: { type: Number, default: 0, min: 0 }, // AED
    images: { type: [String], default: [] }, // gallery (cloud paths)
    image: { type: String, default: "" }, // primary thumbnail (= images[0])
    collectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Collection",
      default: null,
    },
    notes: { type: String, default: "", trim: true },
    purchasedFrom: { type: String, default: "", trim: true },
    purchaseDate: { type: Date, default: null },
    verified: { type: Boolean, default: false },

    // Cached valuation results (recomputed on every create/update).
    estimatedValue: { type: Number, default: 0 },
    resaleValue: { type: Number, default: 0 },
    metalValue: { type: Number, default: 0 },
    stoneValue: { type: Number, default: 0 },
    valuedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
