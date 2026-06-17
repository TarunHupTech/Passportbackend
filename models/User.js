const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    // Required for email/password accounts; Shopify-SSO accounts have none.
    password: {
      type: String,
      minlength: 6,
      select: false,
      required: function () {
        return !this.shopifyCustomerId;
      },
    },
    // Set when the account is linked to a Shopify customer (SSO).
    shopifyCustomerId: { type: String, unique: true, sparse: true },
    shopifyDomain: { type: String, default: "" },
  },
  { timestamps: true }
);

// Hash password before saving when it has been modified.
// (Mongoose 9 async pre-hooks resolve via the returned promise — no `next`.)
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = function (entered) {
  return bcrypt.compare(entered, this.password);
};

// Two-letter avatar initials (e.g. "Sarah Al Maktoum" -> "SA").
userSchema.virtual("initials").get(function () {
  const parts = (this.name || "").trim().split(/\s+/);
  const first = parts[0]?.[0] || "";
  const second = parts[1]?.[0] || "";
  return (first + second).toUpperCase();
});

userSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("User", userSchema);
