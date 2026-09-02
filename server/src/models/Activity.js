const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema(
	{
		household: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Household",
			required: true,
		},

		item: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Item",
		},

		// Snapshot of the item's name at the time of the action, so a log
		// entry still reads correctly even after the item itself is deleted.
		itemName: {
			type: String,
			trim: true,
		},

		user: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},

		action: {
			type: String,
			enum: [
				"item_added",
				"item_updated",
				"quantity_updated",
				"item_removed",
				"member_joined",
				"member_left",
				"member_removed",
			],
			required: true,
		},

		message: {
			type: String,
			required: true,
		},

		previousQuantity: {
			type: Number,
		},

		newQuantity: {
			type: Number,
		},
	},
	{
		// Log entries are never edited after creation, so there's no
		// need for an updatedAt timestamp.
		timestamps: { createdAt: true, updatedAt: false },
	}
);

// Activity is almost always queried as "latest activity for a household".
activitySchema.index({ household: 1, createdAt: -1 });

module.exports = mongoose.model("Activity", activitySchema);
