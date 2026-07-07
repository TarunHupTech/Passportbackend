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
    // These option lists are admin-managed (see the Attribute model), so the
    // fields are plain strings — values are validated against the live lists
    // on the client, not via a fixed schema enum.
    itemType: { type: String, default: "Other", trim: true },
    metalType: { type: String, default: "Gold", trim: true },
    purity: { type: String, default: "22k", trim: true },
    netWeight: { type: Number, default: 0, min: 0 }, // grams
    grossWeight: { type: Number, default: 0, min: 0 }, // grams
    stoneType: { type: String, default: "None", trim: true },
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
