const Activity = require("../models/Activity");

const getActivity = async (req, res) => {
	try {
		const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);

		const activity = await Activity.find({ household: req.params.id })
			.sort({ createdAt: -1 })
			.limit(limit)
			.populate("user", "name email");

		res.status(200).json({
			message: "Activity retrieved successfully",
			activity,
		});
	} catch (error) {
		console.error("Get activity error:", error);

		res.status(500).json({
			message: "Server error while retrieving activity",
		});
	}
};

module.exports = { getActivity };
