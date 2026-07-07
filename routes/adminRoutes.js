const express = require("express");
const router = express.Router();
const {
  login,
  me,
  analytics,
  getAttributes,
  addAttribute,
  removeAttribute,
} = require("../controller/adminController");
const { adminProtect } = require("../middlerware/adminAuth");

router.post("/login", login);
router.get("/me", adminProtect, me);
router.get("/analytics", adminProtect, analytics);

// Manage the customer-facing option lists.
router.get("/attributes", adminProtect, getAttributes);
router.post("/attributes/add", adminProtect, addAttribute);
router.post("/attributes/remove", adminProtect, removeAttribute);

module.exports = router;
