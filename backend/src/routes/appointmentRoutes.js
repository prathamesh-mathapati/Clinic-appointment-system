const express = require("express");
const router = express.Router();
const {
    createAppointment,
    getAppointments,
    getAppointmentById,
    updateAppointment,
    arriveAppointment,
    cancelAppointment,
} = require("../controllers/appointmentController");
const { protect } = require("../middlewares/authMiddleware");

router.post("/", protect, createAppointment);
router.get("/", protect, getAppointments);
router.get("/:id", protect, getAppointmentById);
router.put("/:id", protect, updateAppointment);
router.post("/:id/arrive", protect, arriveAppointment);
router.delete("/:id", protect, cancelAppointment);

module.exports = router;
