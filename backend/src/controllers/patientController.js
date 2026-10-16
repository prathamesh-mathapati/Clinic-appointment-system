const Patient = require("../models/Patient");

const searchPatients = async (req, res, next) => {
    try {
        const { q } = req.query;

        if (!q || q.trim().length === 0) {
            return res.status(200).json({
                success: true,
                data: { patients: [] },
            });
        }

        const queryRegex = new RegExp(q.trim(), "i");

        const patients = await Patient.find({
            $or: [
                { name: queryRegex },
                { mobile: queryRegex },
                { patientId: queryRegex },
            ],
        }).limit(20);

        res.status(200).json({
            success: true,
            data: { patients },
        });
    } catch (error) {
        next(error);
    }
};

const createPatient = async (req, res, next) => {
    try {
        const { name, mobile, email, dob, gender, address } = req.body;

        if (!name || !mobile) {
            return res.status(400).json({
                success: false,
                message: "Patient name and mobile are required",
            });
        }

        let patient = await Patient.findOne({ mobile: mobile.trim() });
        if (patient) {
            return res.status(200).json({
                success: true,
                message: "Existing patient found",
                data: { patient },
            });
        }

        patient = await Patient.create({
            name: name.trim(),
            mobile: mobile.trim(),
            email: email ? email.trim() : undefined,
            dob,
            gender: gender || "male",
            address,
        });

        res.status(201).json({
            success: true,
            message: "Patient record created successfully",
            data: { patient },
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { searchPatients, createPatient };
