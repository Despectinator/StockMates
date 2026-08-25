const mongoose = require("mongoose");

const householdMemberSchema = new mongoose.Schema(
	{
		user: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},

		role: {
			type: String,
			enum: ["owner", "member"],
			default: "member",
		},
	},
	{
		_id: false,
	}
);

const householdSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: true,
			trim: true,
			minlength: 2,
			maxlength: 100,
		},

		owner: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},

		members: {
			type: [householdMemberSchema],
			default: [],
		},
	},
	{
		timestamps: true,
	}
);

module.exports = mongoose.model("Household", householdSchema);
