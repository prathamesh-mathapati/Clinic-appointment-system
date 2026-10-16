const http = require("http");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const connectDB = require("./src/config/db");
const { initSocket } = require("./src/config/socket");
const seedDatabase = require("./src/config/seed");

const authRoutes = require("./src/routes/authRoutes");
const doctorRoutes = require("./src/routes/doctorRoutes");
const slotRoutes = require("./src/routes/slotRoutes");
const appointmentRoutes = require("./src/routes/appointmentRoutes");
const patientRoutes = require("./src/routes/patientRoutes");
const staffRoutes = require("./src/routes/staffRoutes");
const auditRoutes = require("./src/routes/auditRoutes");

const errorHandler = require("./src/middlewares/errorHandler");

dotenv.config();

connectDB().then(() => {
    seedDatabase();
});

const app = express();

const isOriginAllowed = (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
        origin.includes("localhost") ||
        origin.endsWith(".vercel.app") ||
        origin === process.env.CLIENT_URL
    ) {
        return callback(null, true);
    }
    return callback(null, true);
};

app.use(
    cors({
        origin: isOriginAllowed,
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
);


app.use(express.json());

app.use(async (req, res, next) => {
    await connectDB();
    next();
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1", doctorRoutes);
app.use("/api/v1/slots", slotRoutes);
app.use("/api/v1/appointments", appointmentRoutes);
app.use("/api/v1/patients", patientRoutes);
app.use("/api/v1/users", staffRoutes);
app.use("/api/v1/audit-logs", auditRoutes);

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Clinic EMR Appointment API is running",
    });
});

app.use(errorHandler);

if (!process.env.VERCEL) {
    const server = http.createServer(app);
    initSocket(server);

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;