const express = require("express");
const router = express.Router();
const {
  login,
  me,
  analytics,
  listCustomers,
  customerDetail,
  getAttributes,
  addAttribute,
  removeAttribute,
} = require("../controller/adminController");
const { adminProtect } = require("../middlerware/adminAuth");

router.post("/login", login);
router.get("/me", adminProtect, me);
router.get("/analytics", adminProtect, analytics);

// Customers list + per-customer summary.
router.get("/customers", adminProtect, listCustomers);
router.get("/customers/:id", adminProtect, customerDetail);

// Manage the customer-facing option lists.
router.get("/attributes", adminProtect, getAttributes);
router.post("/attributes/add", adminProtect, addAttribute);
router.post("/attributes/remove", adminProtect, removeAttribute);

module.exports = router;
