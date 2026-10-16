const mongoose = require("mongoose")

const appointmentSchema = new mongoose.Schema({
    patient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Patient",
        required: true
    },
    doctor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Department",
        required: true
    },
    date: {
        type: String,
        required: true,
        index: true
    },
    slotTime: {
        type: String,
        required: true
    },
    slotEndTime: {
        type: String,
        required: false
    },
    status: {
        type: String,
        enum: ["scheduled", "arrived", "completed", "cancelled"],
        default: "scheduled",
        index: true
    },
    purpose: {
        type: String
    },
    notes: {
        type: String
    }
}, { timestamps: true })

appointmentSchema.index({
    doctor: 1, date: 1, slotTime: 1
},
    { unique: true, partialFilterExpression: { status: { $ne: "cancelled" } } }
)

module.exports = mongoose.model("Appointment", appointmentSchema);