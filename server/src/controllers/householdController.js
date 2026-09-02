const Household = require("../models/Household");
const User = require("../models/User");
const logActivity = require("../utils/activityLogger");
const { removeUserFromHousehold } = require("../socket/householdSocket");

const createHousehold = async (req, res) => {
	try {
		const { name } = req.body;

		// Validate household name
		if (!name || !name.trim()) {
			return res.status(400).json({
				message: "Household name is required",
			});
		}

		// Get logged-in user from JWT middleware
		const userId = req.user.userId;

		// Create household
		const household = await Household.create({
			name: name.trim(),
			owner: userId,
			members: [
				{
					user: userId,
					role: "owner",
				},
			],
		});

		res.status(201).json({
			message: "Household created successfully",
			household,
		});
	} catch (error) {
		console.error("Create household error:", error);

		res.status(500).json({
			message: "Server error while creating household",
		});
	}
};

const joinHousehold = async (req, res) => {
	try {
		const { id } = req.params;
		const userId = req.user.userId;

		// Find household
		const household = await Household.findById(id);

		if (!household) {
			return res.status(404).json({
				message: "Household not found",
			});
		}

		// Check if user is already a member
		const alreadyMember = household.members.some(
			(member) => member.user.toString() === userId
		);

		if (alreadyMember) {
			return res.status(400).json({
				message: "User is already a member of this household",
			});
		}

		// Get joining user's information
		const user = await User.findById(userId).select("name email");

		if (!user) {
			return res.status(404).json({
				message: "User not found",
			});
		}

		// Add user as a member
		household.members.push({
			user: userId,
			role: "member",
		});

		await household.save();

		// Get Socket.IO instance
		const io = req.app.get("io");

		// Log household activity and broadcast it in real time
		await logActivity({
			household: id,
			user: userId,
			action: "member_joined",
			message: `${user.name} joined the household`,
			io,
		});

		res.status(200).json({
			message: "Joined household successfully",
			household,
		});
	} catch (error) {
		console.error("Join household error:", error);

		res.status(500).json({
			message: "Server error while joining household",
		});
	}
};

const getHousehold = async (req, res) => {
	try {
		const household = await Household.findById(req.params.id)
			.populate("owner", "name email")
			.populate("members.user", "name email");

		res.status(200).json({
			message: "Household retrieved successfully",
			household,
		});
	} catch (error) {
		console.error("Get household error:", error);

		res.status(500).json({
			message: "Server error while retrieving household",
		});
	}
};

const getHouseholdMembers = async (req, res) => {
	try {
		const household = await Household.findById(req.params.id)
			.populate("members.user", "name email");

		res.status(200).json({
			message: "Household members retrieved successfully",
			members: household.members,
		});
	} catch (error) {
		console.error("Get household members error:", error);

		res.status(500).json({
			message: "Server error while retrieving household members",
		});
	}
};

const removeMember = async (req, res) => {
	try {
		const household = req.household;
		const userIdToRemove = req.params.userId;

		if (household.owner.toString() === userIdToRemove) {
			return res.status(400).json({
				message: "The household owner cannot be removed",
			});
		}

		const memberExists = household.members.some(
			(member) => member.user.toString() === userIdToRemove
		);

		if (!memberExists) {
			return res.status(404).json({
				message: "User is not a member of this household",
			});
		}

		// Get the member's information before removing them
		const userToRemove = await User.findById(userIdToRemove).select(
			"name email"
		);

		if (!userToRemove) {
			return res.status(404).json({
				message: "User not found",
			});
		}

		// Remove member from database
		household.members = household.members.filter(
			(member) => member.user.toString() !== userIdToRemove
		);

		await household.save();

		const io = req.app.get("io");

		// Force any active sockets belonging to the removed user
		// out of this household and update presence.
		if (io) {
			removeUserFromHousehold(io, household._id, userIdToRemove);
		}

		// Record the removal in the activity feed.
		await logActivity({
			household: household._id,
			user: req.user.userId,
			action: "member_removed",
			message: `${userToRemove.name} was removed from the household`,
			io,
		});

		res.status(200).json({
			message: "Member removed successfully",
			household,
		});
	} catch (error) {
		console.error("Remove member error:", error);

		res.status(500).json({
			message: "Server error while removing member",
		});
	}
};

const leaveHousehold = async (req, res) => {
	try {
		const household = await Household.findById(req.params.id);
		const userId = req.user.userId;

		if (!household) {
			return res.status(404).json({
				message: "Household not found",
			});
		}

		if (household.owner.toString() === userId) {
			return res.status(400).json({
				message: "Household owner cannot leave the household",
			});
		}

		const memberExists = household.members.some(
			(member) => member.user.toString() === userId
		);

		if (!memberExists) {
			return res.status(400).json({
				message: "You are not a member of this household",
			});
		}

		// Get leaving user's information
		const user = await User.findById(userId).select("name email");

		if (!user) {
			return res.status(404).json({
				message: "User not found",
			});
		}

		// Remove user from household
		household.members = household.members.filter(
			(member) => member.user.toString() !== userId
		);

		await household.save();

		// Get Socket.IO instance
		const io = req.app.get("io");

		// Log and broadcast leave activity
		await logActivity({
			household: household._id,
			user: userId,
			action: "member_left",
			message: `${user.name} left the household`,
			io,
		});

		res.status(200).json({
			message: "You have left the household successfully",
		});
	} catch (error) {
		console.error("Leave household error:", error);

		res.status(500).json({
			message: "Server error while leaving household",
		});
	}
};

const getMyHousehold = async (req, res) => {
	try {
		const userId = req.user.userId;

		const household = await Household.findOne({
			"members.user": userId,
		})
			.sort({ createdAt: 1 })
			.populate("owner", "name email")
			.populate("members.user", "name email");

		if (!household) {
			return res.status(404).json({
				message: "You do not belong to a household",
			});
		}

		res.status(200).json({
			message: "Household retrieved successfully",
			household,
		});
	} catch (error) {
		console.error("Get my household error:", error);

		res.status(500).json({
			message: "Server error while retrieving your household",
		});
	}
};

const getMyHouseholds = async (req, res) => {
	try {
		const households = await Household.find({
			"members.user": req.user.userId,
		})
			.sort({ createdAt: 1 })
			.populate("owner", "name email")
			.populate("members.user", "name email");

		res.status(200).json({
			message: "Households retrieved successfully",
			households,
		});
	} catch (error) {
		console.error("Get my households error:", error);

		res.status(500).json({
			message: "Server error while retrieving your households",
		});
	}
};

const deleteHousehold = async (req, res) => {
	try {
		const household = req.household;

		await Household.deleteOne({ _id: household._id });

		res.status(200).json({
			message: "Household deleted successfully",
		});
	} catch (error) {
		console.error("Delete household error:", error);

		res.status(500).json({
			message: "Server error while deleting household",
		});
	}
};

module.exports = {
	createHousehold,
	joinHousehold,
	getHousehold,
	getHouseholdMembers,
	removeMember,
	leaveHousehold,
	getMyHousehold,
	getMyHouseholds,
	deleteHousehold,
};
