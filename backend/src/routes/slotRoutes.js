const express = require("express");
const router = express.Router();
const { getSlots } = require("../controllers/slotController");
const { protect } = require("../middlewares/authMiddleware");

router.get("/", protect, getSlots);

module.exports = router;
