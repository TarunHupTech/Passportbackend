const express = require("express");
const router = express.Router();
const { get } = require("../controller/settingsController");
const { protect } = require("../middlerware/auth");

router.get("/", protect, get);

module.exports = router;
