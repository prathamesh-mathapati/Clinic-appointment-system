const express = require("express");
const router = express.Router();
const {
    getDoctors,
    createDoctor,
    getDoctorSchedule,
    updateDoctorSchedule,
    getDepartments,
    createDepartment,
} = require("../controllers/doctorController");
const { protect } = require("../middlewares/authMiddleware");
const { authorize } = require("../middlewares/rbacMiddleware");

router.get("/doctors", protect, getDoctors);
router.post("/doctors", protect, authorize("super_admin"), createDoctor);
router.get("/doctors/:id/schedule", protect, getDoctorSchedule);
router.put("/doctors/:id/schedule", protect, authorize("super_admin"), updateDoctorSchedule);
router.get("/departments", protect, getDepartments);
router.post("/departments", protect, authorize("super_admin"), createDepartment);

module.exports = router;
