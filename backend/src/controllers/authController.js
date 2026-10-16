const jwt = require("jsonwebtoken");
const User = require("../models/User");
const generateTokens = require("../utils/generateTokens");
const AuditLog = require("../models/AuditLog");

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Please provide email and password",
            });
        }

        const user = await User.findOne({ email }).select("+password").populate("department", "name");
        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: "Your account is deactivated. Contact administrator",
            });
        }

        const { accessToken, refreshToken } = generateTokens(user);

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        await AuditLog.create({
            user: user._id,
            userName: user.name,
            userRole: user.role,
            action: "LOGIN",
            entity: "Auth",
            details: `User logged in`,
        });

        user.password = undefined;

        return res.status(200).json({
            success: true,
            message: "Login successful",
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    department: user.department,
                    specialization: user.specialization,
                },
                accessToken,
                refreshToken,
            },
        });
    } catch (error) {
        next(error);
    }
};

const refresh = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                message: "Refresh token is required",
            });
        }

        let decoded;
        try {
            decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        } catch (error) {
            return res.status(401).json({
                success: false,
                message: "Invalid or expired refresh token",
            });
        }

        const user = await User.findById(decoded.id || decoded._id);
        if (!user || user.refreshToken !== refreshToken || !user.isActive) {
            return res.status(401).json({
                success: false,
                message: "Invalid refresh token or user is deactivated",
            });
        }

        const tokens = generateTokens(user);

        return res.status(200).json({
            success: true,
            message: "Token refreshed successfully",
            data: {
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
            },
        });
    } catch (error) {
        next(error);
    }
};

const logout = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        if (refreshToken) {
            const user = await User.findOne({ refreshToken });
            if (user) {
                user.refreshToken = null;
                await user.save({ validateBeforeSave: false });

                await AuditLog.create({
                    user: user._id,
                    userName: user.name,
                    userRole: user.role,
                    action: "LOGOUT",
                    entity: "Auth",
                    details: "User logged out",
                });
            }
        }

        return res.status(200).json({
            success: true,
            message: "Logged out successfully",
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { login, refresh, logout };