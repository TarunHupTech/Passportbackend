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
    images: { type: [String], default: [] }, // gallery (cloud paths)
    image: { type: String, default: "" }, // primary thumbnail (= images[0])

    // Free-text brand name (links the item to a Brand on the Brands page).
    brand: { type: String, default: "", trim: true, index: true },

    // Value is entered directly by the customer (AED).
    invoiceAmount: { type: Number, default: 0, min: 0 },
    // Internal value used by dashboard/certificate roll-ups — mirrors invoiceAmount.
    estimatedValue: { type: Number, default: 0 },

    notes: { type: String, default: "", trim: true },
    occasion: { type: String, default: "", trim: true },
    purchasedFrom: { type: String, default: "", trim: true },

    // Either a purchase date, or (when gifted) a gifted date.
    isGift: { type: Boolean, default: false },
    purchaseDate: { type: Date, default: null },
    giftedDate: { type: Date, default: null },

    verified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
