const express = require("express");
const router = express.Router();
const { register, login, me } = require("../controller/authController");
const { protect } = require("../middlerware/auth");

router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, me);

module.exports = router;
