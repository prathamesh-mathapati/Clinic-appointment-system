const Appointment = require("../models/Appointment");
const Patient = require("../models/Patient");
const User = require("../models/User");
const AuditLog = require("../models/AuditLog");
const { getIO } = require("../config/socket");

const createAppointment = async (req, res, next) => {
    try {
        const { patientId, newPatient, doctorId, departmentId, date, slotTime, slotEndTime, purpose, notes } = req.body;

        let patientDocId = patientId;

        if (!patientDocId && newPatient && newPatient.name && newPatient.mobile) {
            let patient = await Patient.findOne({ mobile: newPatient.mobile.trim() });
            if (!patient) {
                patient = await Patient.create({
                    name: newPatient.name.trim(),
                    mobile: newPatient.mobile.trim(),
                    email: newPatient.email,
                    dob: newPatient.dob,
                    gender: newPatient.gender || "male",
                });
            }
            patientDocId = patient._id;
        }

        if (!patientDocId || !doctorId || !date || !slotTime) {
            return res.status(400).json({
                success: false,
                message: "Patient, doctor, date, and slot time are required",
            });
        }

        let resolvedDept = departmentId;
        if (!resolvedDept) {
            const doctor = await User.findById(doctorId);
            resolvedDept = doctor?.department;
        }

        const alreadyBooked = await Appointment.findOne({
            doctor: doctorId,
            date,
            slotTime,
            status: { $ne: "cancelled" },
        });

        if (alreadyBooked) {
            return res.status(409).json({
                success: false,
                message: "This slot is already booked. Please choose another slot.",
            });
        }

        const appointment = await Appointment.create({
            patient: patientDocId,
            doctor: doctorId,
            department: resolvedDept,
            date,
            slotTime,
            slotEndTime: slotEndTime || slotTime,
            purpose: purpose || "",
            notes: notes || "",
            status: "scheduled",
        });

        const savedAppointment = await Appointment.findById(appointment._id)
            .populate("patient", "name mobile patientId email")
            .populate("doctor", "name email specialization")
            .populate("department", "name");

        await AuditLog.create({
            user: req.user?._id,
            userName: req.user?.name || "Staff",
            userRole: req.user?.role || "receptionist",
            action: "APPOINTMENT_CREATED",
            entity: "Appointment",
            entityId: appointment._id,
            details: `Booked appointment for ${savedAppointment.patient?.name} with Dr. ${savedAppointment.doctor?.name}`,
        });

        try {
            getIO().emit("appointment:created", savedAppointment);
        } catch (err) {}

        return res.status(201).json({
            success: true,
            message: "Appointment booked successfully",
            data: { appointment: savedAppointment },
        });
    } catch (error) {
        next(error);
    }
};

const getAppointments = async (req, res, next) => {
    try {
        const { search, status, department, doctor, startDate, endDate, date, page = 1, limit = 10 } = req.query;

        const query = {};

        if (req.user && req.user.role === "doctor") {
            query.doctor = req.user._id;
        } else if (doctor) {
            query.doctor = doctor;
        }

        if (status) query.status = status;
        if (department) query.department = department;

        if (date) {
            query.date = date;
        } else if (startDate && endDate) {
            query.date = { $gte: startDate, $lte: endDate };
        } else if (startDate) {
            query.date = { $gte: startDate };
        }

        if (search && search.trim()) {
            const regex = new RegExp(search.trim(), "i");
            const patients = await Patient.find({
                $or: [{ name: regex }, { mobile: regex }, { patientId: regex }],
            }).select("_id");
            query.patient = { $in: patients.map((p) => p._id) };
        }

        const pageNumber = Number(page) || 1;
        const pageSize = Number(limit) || 10;
        const skip = (pageNumber - 1) * pageSize;

        const total = await Appointment.countDocuments(query);
        const appointments = await Appointment.find(query)
            .sort({ date: -1, slotTime: 1 })
            .skip(skip)
            .limit(pageSize)
            .populate("patient", "name mobile patientId email dob gender")
            .populate("doctor", "name email specialization")
            .populate("department", "name");

        return res.status(200).json({
            success: true,
            data: {
                appointments,
                meta: {
                    total,
                    page: pageNumber,
                    pages: Math.ceil(total / pageSize) || 1,
                    limit: pageSize,
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

const getAppointmentById = async (req, res, next) => {
    try {
        const appointment = await Appointment.findById(req.params.id)
            .populate("patient")
            .populate("doctor", "name email specialization")
            .populate("department", "name");

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: "Appointment not found",
            });
        }

        return res.status(200).json({
            success: true,
            data: { appointment },
        });
    } catch (error) {
        next(error);
    }
};

const updateAppointment = async (req, res, next) => {
    try {
        const { purpose, notes, status } = req.body;

        const appointment = await Appointment.findById(req.params.id);
        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: "Appointment not found",
            });
        }

        if (purpose !== undefined) appointment.purpose = purpose;
        if (notes !== undefined) appointment.notes = notes;
        if (status !== undefined) appointment.status = status;

        await appointment.save();

        const updated = await Appointment.findById(appointment._id)
            .populate("patient", "name mobile patientId")
            .populate("doctor", "name email specialization")
            .populate("department", "name");

        await AuditLog.create({
            user: req.user?._id,
            userName: req.user?.name || "Staff",
            userRole: req.user?.role || "receptionist",
            action: "APPOINTMENT_UPDATED",
            entity: "Appointment",
            entityId: appointment._id,
            details: `Updated appointment notes for patient ${updated.patient?.name}`,
        });

        try {
            getIO().emit("appointment:updated", updated);
        } catch (e) {}

        return res.status(200).json({
            success: true,
            message: "Appointment updated successfully",
            data: { appointment: updated },
        });
    } catch (error) {
        next(error);
    }
};

const arriveAppointment = async (req, res, next) => {
    try {
        const appointment = await Appointment.findById(req.params.id);
        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: "Appointment not found",
            });
        }

        appointment.status = "arrived";
        await appointment.save();

        const updated = await Appointment.findById(appointment._id)
            .populate("patient", "name mobile patientId")
            .populate("doctor", "name email specialization")
            .populate("department", "name");

        await AuditLog.create({
            user: req.user?._id,
            userName: req.user?.name || "Staff",
            userRole: req.user?.role || "receptionist",
            action: "APPOINTMENT_ARRIVED",
            entity: "Appointment",
            entityId: appointment._id,
            details: `Marked patient ${updated.patient?.name} as arrived`,
        });

        try {
            getIO().emit("appointment:arrived", updated);
        } catch (e) {}

        return res.status(200).json({
            success: true,
            message: "Patient marked as arrived",
            data: { appointment: updated },
        });
    } catch (error) {
        next(error);
    }
};

const cancelAppointment = async (req, res, next) => {
    try {
        const appointment = await Appointment.findById(req.params.id);
        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: "Appointment not found",
            });
        }

        appointment.status = "cancelled";
        await appointment.save();

        const updated = await Appointment.findById(appointment._id)
            .populate("patient", "name mobile patientId")
            .populate("doctor", "name email specialization")
            .populate("department", "name");

        await AuditLog.create({
            user: req.user?._id,
            userName: req.user?.name || "Staff",
            userRole: req.user?.role || "receptionist",
            action: "APPOINTMENT_CANCELLED",
            entity: "Appointment",
            entityId: appointment._id,
            details: `Cancelled appointment on ${appointment.date} at ${appointment.slotTime}`,
        });

        try {
            getIO().emit("appointment:cancelled", updated);
        } catch (e) {}

        return res.status(200).json({
            success: true,
            message: "Appointment cancelled successfully",
            data: { appointment: updated },
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createAppointment,
    getAppointments,
    getAppointmentById,
    updateAppointment,
    arriveAppointment,
    cancelAppointment,
};
