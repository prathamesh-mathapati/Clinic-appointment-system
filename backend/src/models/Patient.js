const mongoose = require("mongoose")

const patientSchema = new mongoose.Schema({
    patientId: {
        type: String,
        unique: true,
        index: true,
    },
    name: {
        type: String,
        required: true,
        index: true
    },
    mobile: {
        type: String,
        required: true,
        index: true
    },
    email: {
        type: String
    },
    dob: {
        type: String
    }, gender: {
        type: String,
        enum: ["male", "female", "other"],
        default: "male"
    },
    address: {
        type: String
    }
}, { timestamps: true })


patientSchema.pre("save", async function () {
    if (!this.patientId) {
        this.patientId = `PAT-${Math.floor(10000 + Math.random() * 90000)}`;
    }
});

module.exports = mongoose.model("Patient", patientSchema)