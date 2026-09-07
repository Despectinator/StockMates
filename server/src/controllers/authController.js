const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const registerUser = async (req, res) => {
	try {
		const { name, email, password } = req.body;

		// Validate required fields
		if (!name || !email || !password) {
			return res.status(400).json({
				message: "Name, email, and password are required",
			});
		}

		// Check password length
		if (password.length < 6) {
			return res.status(400).json({
				message: "Password must be at least 6 characters long",
			});
		}

		// Check whether user already exists
		const existingUser = await User.findOne({ email });

		if (existingUser) {
			return res.status(409).json({
				message: "User with this email already exists",
			});
		}

		// Hash password
		const hashedPassword = await bcrypt.hash(password, 12);

		// Create user
		const user = await User.create({
			name,
			email,
			password: hashedPassword,
		});

		// Return safe user data
		res.status(201).json({
			message: "User registered successfully",
			user: {
				id: user._id,
				name: user.name,
				email: user.email,
				role: user.role,
			},
		});
	} catch (error) {
		console.error("Registration error:", error);

		res.status(500).json({
			message: "Server error during registration",
		});
	}
};

const loginUser = async (req, res) => {
	try {
		const { email, password } = req.body;

		// Validate required fields
		if (!email || !password) {
			return res.status(400).json({
				message: "Email and password are required",
			});
		}

		// Find user
		const user = await User.findOne({ email });

		if (!user) {
			return res.status(401).json({
				message: "Invalid email or password",
			});
		}

		// Compare password with hashed password
		const isPasswordValid = await bcrypt.compare(
			password,
			user.password
		);

		if (!isPasswordValid) {
			return res.status(401).json({
				message: "Invalid email or password",
			});
		}

		// Create JWT
		const token = jwt.sign(
			{
				userId: user._id,
				role: user.role,
			},
			process.env.JWT_SECRET,
			{
				expiresIn: process.env.JWT_EXPIRES_IN || "30m",
			}
		);

		// Send response
		res.status(200).json({
			message: "Login successful",
			token,
			user: {
				id: user._id,
				name: user.name,
				email: user.email,
				role: user.role,
			},
		});
	} catch (error) {
		console.error("Login error:", error);

		res.status(500).json({
			message: "Server error during login",
		});
	}
};

const getProfile = async (req, res) => {
	try {
		const user = await User.findById(req.user.userId).select("-password");

		if (!user) {
			return res.status(404).json({
				message: "User not found",
			});
		}

		res.status(200).json({
			message: "Profile retrieved successfully",
			user,
		});
	} catch (error) {
		console.error("Profile error:", error);

		res.status(500).json({
			message: "Server error while retrieving profile",
		});
	}
};

const updateProfile = async (req, res) => {
	try {
		const { name, email, currentPassword, newPassword } = req.body;

		const user = await User.findById(req.user.userId);

		if (!user) {
			return res.status(404).json({
				message: "User not found",
			});
		}

		if (name !== undefined) {
			if (!name.trim()) {
				return res.status(400).json({
					message: "Name cannot be empty",
				});
			}

			user.name = name.trim();
		}

		if (email !== undefined) {
			const normalizedEmail = email.trim().toLowerCase();

			if (!normalizedEmail) {
				return res.status(400).json({
					message: "Email cannot be empty",
				});
			}

			if (normalizedEmail !== user.email) {
				const existingUser = await User.findOne({ email: normalizedEmail });

				if (existingUser) {
					return res.status(409).json({
						message: "Email is already in use",
					});
				}

				user.email = normalizedEmail;
			}
		}

		// Password changes require the current password, even though the
		// request is already authenticated - this prevents a hijacked
		// session (or a shared device) from silently locking the real
		// owner out of their account.
		if (newPassword !== undefined) {
			if (!currentPassword) {
				return res.status(400).json({
					message: "Current password is required to set a new password",
				});
			}

			const isCurrentPasswordValid = await bcrypt.compare(
				currentPassword,
				user.password
			);

			if (!isCurrentPasswordValid) {
				return res.status(401).json({
					message: "Current password is incorrect",
				});
			}

			if (newPassword.length < 6) {
				return res.status(400).json({
					message: "New password must be at least 6 characters long",
				});
			}

			user.password = await bcrypt.hash(newPassword, 12);
		}

		await user.save();

		res.status(200).json({
			message: "Profile updated successfully",
			user: {
				id: user._id,
				name: user.name,
				email: user.email,
				role: user.role,
			},
		});
	} catch (error) {
		console.error("Update profile error:", error);

		res.status(500).json({
			message: "Server error while updating profile",
		});
	}
};

module.exports = {
	registerUser,
	loginUser,
	getProfile,
	updateProfile,
};
