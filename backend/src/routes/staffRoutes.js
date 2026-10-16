const express = require("express");
const router = express.Router();
const { getStaff, createReceptionist } = require("../controllers/staffController");
const { protect } = require("../middlewares/authMiddleware");
const { authorize } = require("../middlewares/rbacMiddleware");

router.get("/staff", protect, authorize("super_admin"), getStaff);
router.post("/receptionists", protect, authorize("super_admin"), createReceptionist);

module.exports = router;
