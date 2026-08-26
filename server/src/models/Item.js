const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema(
	{
		household: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Household",
			required: true,
		},

		name: {
			type: String,
			required: true,
			trim: true,
			minlength: 1,
			maxlength: 100,
		},

		category: {
			type: String,
			trim: true,
			default: "General",
		},

		quantity: {
			type: Number,
			required: true,
			min: 0,
			default: 0,
		},

		unit: {
			type: String,
			trim: true,
			default: "pcs",
		},

		lowStockThreshold: {
			type: Number,
			required: true,
			min: 0,
			default: 1,
		},

		status: {
			type: String,
			enum: ["in-stock", "low-stock", "out-of-stock"],
			default: "in-stock",
		},

		addedBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},

		lastUpdatedBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
		},
	},
	{
		timestamps: true,
	}
);

// Keep "status" in sync with quantity vs lowStockThreshold on every save,
// so callers never have to set it manually.
itemSchema.pre("save", function () {
	if (this.quantity === 0) {
		this.status = "out-of-stock";
	} else if (this.quantity <= this.lowStockThreshold) {
		this.status = "low-stock";
	} else {
		this.status = "in-stock";
	}
});

module.exports = mongoose.model("Item", itemSchema);
