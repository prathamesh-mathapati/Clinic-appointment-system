const express = require("express")
const { refresh, login, logout } = require("../controllers/authController.js")
const router = express.Router()

router.post("/login", login);
router.post("/refresh", refresh)
router.post("/logout", logout)

module.exports = router;