const express = require("express");
const router = express.Router();
const ctrl = require("../controller/productController");
const { protect } = require("../middlerware/auth");

router.use(protect);

router.get("/", ctrl.list);
router.post("/", ctrl.create);
router.get("/:id", ctrl.getOne);
router.put("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);

module.exports = router;
