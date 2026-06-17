const express = require("express");
const router = express.Router();
const upload = require("../middlerware/upload");
const { uploadImage, uploadImages } = require("../controller/uploadController");
const { protect } = require("../middlerware/auth");

router.post("/", protect, upload.single("image"), uploadImage);
router.post("/multiple", protect, upload.array("images", 8), uploadImages);

module.exports = router;
