const User = require("../models/User");
const Department = require("../models/Department");
const DoctorSchedule = require("../models/DoctorSchedule");

const getDoctors = async (req, res, next) => {
    try {
        const doctors = await User.find({ role: "doctor", isActive: true })
            .select("name email department specialization phone")
            .populate("department", "name");

        res.status(200).json({
            success: true,
            data: { doctors },
        });
    } catch (error) {
        next(error);
    }
};

const createDoctor = async (req, res, next) => {
    try {
        const { name, email, password, department, specialization, phone } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Name, email, and password are required",
            });
        }

        const existing = await User.findOne({ email: email.toLowerCase() });
        if (existing) {
            return res.status(400).json({
                success: false,
                message: "A user with this email already exists",
            });
        }

        const doctor = await User.create({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password,
            role: "doctor",
            department,
            specialization,
            phone,
        });

        await DoctorSchedule.create({
            doctor: doctor._id,
            workingDays: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
            slotDuration: 15,
            sessions: [
                { name: "Morning Session", startTime: "09:00", endTime: "13:00" },
                { name: "Evening Session", startTime: "17:00", endTime: "20:00" },
            ],
            breaks: [
                { name: "Afternoon Break", startTime: "13:00", endTime: "17:00" },
            ],
        });

        const populated = await User.findById(doctor._id).populate("department", "name");

        res.status(201).json({
            success: true,
            message: "Doctor created successfully",
            data: { doctor: populated },
        });
    } catch (error) {
        next(error);
    }
};

const getDoctorSchedule = async (req, res, next) => {
    try {
        let schedule = await DoctorSchedule.findOne({ doctor: req.params.id });

        if (!schedule) {
            schedule = {
                workingDays: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
                slotDuration: 15,
                sessions: [
                    { name: "Morning Session", startTime: "09:00", endTime: "13:00" },
                    { name: "Evening Session", startTime: "17:00", endTime: "20:00" },
                ],
                breaks: [
                    { name: "Afternoon Break", startTime: "13:00", endTime: "17:00" },
                ],
            };
        }

        res.status(200).json({
            success: true,
            data: { schedule },
        });
    } catch (error) {
        next(error);
    }
};

const updateDoctorSchedule = async (req, res, next) => {
    try {
        const { workingDays, slotDuration, sessions, breaks } = req.body;

        const schedule = await DoctorSchedule.findOneAndUpdate(
            { doctor: req.params.id },
            {
                doctor: req.params.id,
                workingDays,
                slotDuration,
                sessions,
                breaks,
            },
            { new: true, upsert: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: "Doctor schedule updated successfully",
            data: { schedule },
        });
    } catch (error) {
        next(error);
    }
};

const getDepartments = async (req, res, next) => {
    try {
        const departments = await Department.find().sort({ name: 1 });
        res.status(200).json({
            success: true,
            data: { departments },
        });
    } catch (error) {
        next(error);
    }
};

const createDepartment = async (req, res, next) => {
    try {
        const { name, description } = req.body;
        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Department name is required",
            });
        }
        const department = await Department.create({
            name: name.trim(),
            description: description?.trim(),
        });
        res.status(201).json({
            success: true,
            message: "Department created successfully",
            data: { department },
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getDoctors,
    createDoctor,
    getDoctorSchedule,
    updateDoctorSchedule,
    getDepartments,
    createDepartment,
};
