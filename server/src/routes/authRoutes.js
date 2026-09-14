const express = require("express");
const rateLimit = require("express-rate-limit");

const {
	registerUser,
	loginUser,
	getProfile,
	updateProfile,
} = require("../controllers/authController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

const authRateLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	limit: 20,
	standardHeaders: true,
	legacyHeaders: false,
	message: {
		message: "Too many attempts. Please try again in a few minutes.",
	},
});

router.post("/register", authRateLimiter, registerUser);
router.post("/login", authRateLimiter, loginUser);
router.get("/profile", protect, getProfile);
router.patch("/profile", protect, updateProfile);

module.exports = router;
