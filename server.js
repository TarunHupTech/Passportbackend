const path = require("path");
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");
const Settings = require("./models/Settings");
const Admin = require("./models/Admin");
const Attribute = require("./models/Attribute");

const app = express();

// --- Middleware ---------------------------------------------------------
app.use(cors({ origin: process.env.CLIENT_URL || true, credentials: true }));
app.use(express.json({ limit: "2mb" }));

// Serve uploaded jewellery photos.
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// --- Routes -------------------------------------------------------------
app.get("/", (req, res) => res.send("LIALI Valuation Portal API running"));
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/products", require("./routes/productRoutes"));
app.use("/api/brands", require("./routes/brandRoutes"));
app.use("/api/dashboard", require("./routes/dashboardRoutes"));
app.use("/api/settings", require("./routes/settingsRoutes"));
app.use("/api/upload", require("./routes/uploadRoutes"));
app.use("/api/shopify", require("./routes/shopifyRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/attributes", require("./routes/attributeRoutes"));

// --- Error handler (catches multer + thrown errors) ---------------------
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.message);
  const status = err.status || (err.code === "LIMIT_FILE_SIZE" ? 413 : 400);
  res.status(status).json({ message: err.message || "Something went wrong" });
});

// --- Startup ------------------------------------------------------------
const PORT = process.env.PORT || 5000;

// Create the admin account from env on first run (separate from customers).
async function seedAdmin() {
  const email = (process.env.ADMIN_EMAIL || "").toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;
  const exists = await Admin.findOne({ email });
  if (!exists) {
    await Admin.create({ name: process.env.ADMIN_NAME || "LIALI Admin", email, password });
    console.log("Seeded admin account:", email);
  }
}

(async () => {
  await connectDB();
  await Settings.getSingleton(); // seed default pricing rules on first run
  await Attribute.getSingleton(); // seed default option lists on first run
  await seedAdmin();
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
})();
