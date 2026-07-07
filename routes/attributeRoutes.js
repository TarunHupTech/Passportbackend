const express = require("express");
const router = express.Router();
const ctrl = require("../controller/attributeController");
const { protect } = require("../middlerware/auth");

// Any signed-in customer can read the option lists (used by the product form).
router.get("/", protect, ctrl.get);

module.exports = router;
