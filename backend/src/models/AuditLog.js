const mongoose = require("mongoose");

const AuditLogSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    userName: {
        type: String,
        required: true
    },
    userRole: {
        type: String,
        required: true
    },
    action: {
        type: String,
        enum: [
            "LOGIN",
            "LOGOUT",
            "APPOINTMENT_CREATED",
            "APPOINTMENT_UPDATED",
            "APPOINTMENT_CANCELLED",
            "APPOINTMENT_ARRIVED",
        ],
        required: true
    },
    entity: {
        type: String,
        default: "Appointment"
    },
    entityId: {
        type: String
    },
    details: {
        type: String
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("AuditLog", AuditLogSchema);