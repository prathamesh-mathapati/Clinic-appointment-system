const mongoose = require("mongoose")

const doctorScheduleSchema = new mongoose.Schema({
    doctor: {
        type: mongoose.Schema.ObjectId,
        ref: "User",
        required: true,
        unique: true
    },
    workingDays: {
        type: [String],
        enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
        default: ["monday", "tuesday", "wednesday", "thursday", "friday"]
    },
    slotDuration: {
        type: Number,
        default: 15,
        required: true
    },
    sessions: [
        {
            name: { type: String, default: "section" },
            startTime: { type: String, required: true },
            endTime: { type: String, required: true }
        }
    ],
    breaks: [
        {
            name: { type: String, default: "Break" },
            startTime: { type: String, required: true },
            endTime: { type: String, required: true }

        }
    ]
}, { timestamps: true })

module.exports = mongoose.model("DoctorSchedule", doctorScheduleSchema)