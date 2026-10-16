const mongoose = require("mongoose");

let isConnected = false;

const connectDB = async () => {
    if (isConnected || mongoose.connection.readyState === 1) {
        return;
    }
    if (!process.env.MONGODB_URI) {
        console.log("MONGODB_URI is not defined in environment variables");
        return;
    }
    try {
        const db = await mongoose.connect(process.env.MONGODB_URI);
        isConnected = db.connections[0].readyState === 1;
        console.log("MongoDB connected successfully");
    } catch (error) {
        console.log("MongoDB connection error:", error.message);
    }
};

module.exports = connectDB;