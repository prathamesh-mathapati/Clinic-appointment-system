const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, minlength: 6, select: false },
    role: { type: String, enum: ["super_admin", "receptionist", "doctor"], default: "receptionist" },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
    specialization: { type: String },
    phone: { type: String },
    refreshToken: { type: String },
    isActive: { type: Boolean, default: true },
}, { timestamps: true })

UserSchema.pre("save", async function () {
    if (!this.isModified("password")) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});
UserSchema.methods.comparePassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password)
}

module.exports = mongoose.model("User", UserSchema);