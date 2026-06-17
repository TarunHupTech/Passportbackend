const mongoose = require("mongoose");

// A single global settings document holding the pricing rules used by the
// valuation engine. Live metal/stone APIs replace these rates in a later
// phase (see SOW Section 5); for now they are editable reference values.
const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: "global", unique: true },
    currency: { type: String, default: "AED" },

    // AED per gram, by purity.
    goldRates: {
      type: Map,
      of: Number,
      default: {
        "24k": 245,
        "22k": 225,
        "21k": 215,
        "18k": 184,
        "14k": 143,
        "925": 3.2, // silver, per gram
      },
    },

    // AED per carat, by stone type.
    stoneRates: {
      type: Map,
      of: Number,
      default: {
        None: 0,
        Diamond: 14000,
        Ruby: 4500,
        Emerald: 4000,
        Sapphire: 3500,
        Pearl: 800,
        Other: 1500,
      },
    },

    // Buy-back recovery factors.
    resaleFactorMetal: { type: Number, default: 0.9 },
    resaleFactorStone: { type: Number, default: 0.6 },
  },
  { timestamps: true }
);

// Fetch (creating defaults on first run) the singleton settings document.
settingsSchema.statics.getSingleton = async function () {
  let doc = await this.findOne({ key: "global" });
  if (!doc) doc = await this.create({ key: "global" });
  return doc;
};

module.exports = mongoose.model("Settings", settingsSchema);
