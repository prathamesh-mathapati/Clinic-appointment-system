const User = require("../models/User");
const Department = require("../models/Department");
const DoctorSchedule = require("../models/DoctorSchedule");
const Patient = require("../models/Patient");

const seedDatabase = async () => {
    try {
        const count = await Department.countDocuments();
        let defaultDept;

        if (count === 0) {
            const departments = await Department.insertMany([
                { name: "General Medicine", description: "Primary healthcare, fever, diabetes, and consultations" },
                { name: "Cardiology", description: "Heart health and cardiovascular care" },
                { name: "Pediatrics", description: "Child health and vaccination" },
                { name: "Dermatology", description: "Skin and hair care" },
                { name: "Orthopedics", description: "Bone, joint, and spine care" },
            ]);
            defaultDept = departments[0];
        } else {
            defaultDept = await Department.findOne({ name: "General Medicine" });
        }

        const admin = await User.findOne({ email: "admin@clinic.com" });
        if (!admin) {
            await User.create({
                name: "Clinic Administrator",
                email: "admin@clinic.com",
                password: "admin123",
                role: "super_admin",
                phone: "+91 9876543211",
            });
        }

        const doctor = await User.findOne({ email: "doctor@clinic.com" });
        if (!doctor && defaultDept) {
            const newDoctor = await User.create({
                name: "Dr. Rohit Sharma",
                email: "doctor@clinic.com",
                password: "doctor123",
                role: "doctor",
                department: defaultDept._id,
                specialization: "General Physician (MBBS, MD)",
                phone: "+91 9876543210",
            });

            await DoctorSchedule.create({
                doctor: newDoctor._id,
                workingDays: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
                slotDuration: 15,
                sessions: [
                    { name: "Morning Session", startTime: "09:00", endTime: "13:00" },
                    { name: "Evening Session", startTime: "17:00", endTime: "21:00" },
                ],
                breaks: [
                    { name: "Lunch & Rest Break", startTime: "13:00", endTime: "17:00" },
                ],
            });
        }

        const receptionist = await User.findOne({ email: "receptionist@clinic.com" });
        if (!receptionist) {
            await User.create({
                name: "Priya Sharma",
                email: "receptionist@clinic.com",
                password: "reception123",
                role: "receptionist",
                phone: "+91 9876543212",
            });
        }

        const patient = await Patient.findOne({ mobile: "9876543210" });
        if (!patient) {
            await Patient.create({
                patientId: "PAT-10001",
                name: "Rahul Verma",
                mobile: "9876543210",
                email: "rahul.verma@example.in",
                dob: "1994-08-15",
                gender: "male",
                address: "Flat 402, Shanti Niketan, MG Road, Pune, Maharashtra - 411001",
            });
        }
    } catch (error) {
        console.error("Seeding error:", error.message);
    }
};

module.exports = seedDatabase;
