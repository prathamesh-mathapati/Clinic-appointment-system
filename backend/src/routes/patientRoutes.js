const express = require("express");
const router = express.Router();
const { searchPatients, createPatient } = require("../controllers/patientController");
const { protect } = require("../middlewares/authMiddleware");

router.get("/search", protect, searchPatients);
router.post("/", protect, createPatient);

module.exports = router;
