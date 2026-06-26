const express = require("express");
const router = express.Router();
const ctrl = require("../controller/brandController");
const { protect } = require("../middlerware/auth");

router.use(protect);

router.get("/", ctrl.list);
router.post("/", ctrl.create);
router.put("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);

module.exports = router;
