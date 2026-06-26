const express = require("express");
const router = express.Router();
const {
  proxyLogin,
  accountSso,
  getCustomerOrders,
} = require("../controller/shopifyController");
const { protect } = require("../middlerware/auth");

// Public endpoints — secured by Shopify's HMAC signature / session-token JWT.
router.get("/proxy", proxyLogin); // App Proxy (online-store storefront link)
router.get("/account-sso", accountSso); // Customer Account UI extension

// Authenticated app endpoints.
router.get("/orders", protect, getCustomerOrders); // logged-in customer's orders

module.exports = router;
