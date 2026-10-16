const User = require("../models/User");

const getStaff = async (req, res, next) => {
    try {
        const staff = await User.find({
            role: { $in: ["doctor", "receptionist"] },
            isActive: true,
        })
            .select("name email role department specialization phone createdAt")
            .populate("department", "name")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: { staff },
        });
    } catch (error) {
        next(error);
    }
};

const createReceptionist = async (req, res, next) => {
    try {
        const { name, email, password, phone } = req.body;

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

        const receptionist = await User.create({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password,
            role: "receptionist",
            phone,
        });

        res.status(201).json({
            success: true,
            message: "Receptionist created successfully",
            data: {
                receptionist: {
                    id: receptionist._id,
                    name: receptionist.name,
                    email: receptionist.email,
                    role: receptionist.role,
                    phone: receptionist.phone,
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { getStaff, createReceptionist };
