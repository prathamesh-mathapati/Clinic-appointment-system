const jwt = require("jsonwebtoken")

const generateTokens = (user) => {
    const accessToken = jwt.sign({ id: user._id, role: user.role, email: user.email }, process.env.JWT_ACCESS_SECRET, { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m" })
    const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN })
    return { accessToken, refreshToken }
}

module.exports = generateTokens