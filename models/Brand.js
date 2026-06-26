const mongoose = require("mongoose");

// A brand the customer owns pieces from (e.g. Cartier). Brands are referenced
// by name on each product; this doc stores the brand's cover image + details.
const brandSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    coverImage: { type: String, default: "" },
  },
  { timestamps: true }
);

// One brand name per user.
brandSchema.index({ user: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("Brand", brandSchema);
