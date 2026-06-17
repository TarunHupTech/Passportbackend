const express = require("express");
const router = express.Router();
const { overview } = require("../controller/dashboardController");
const { protect } = require("../middlerware/auth");

router.get("/", protect, overview);

module.exports = router;
