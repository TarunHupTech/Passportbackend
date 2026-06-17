const express = require("express");
const router = express.Router();
const { proxyLogin, accountSso } = require("../controller/shopifyController");

// Public endpoints — secured by Shopify's HMAC signature / session-token JWT.
router.get("/proxy", proxyLogin); // App Proxy (online-store storefront link)
router.get("/account-sso", accountSso); // Customer Account UI extension

module.exports = router;
