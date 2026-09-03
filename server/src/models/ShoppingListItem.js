const mongoose = require("mongoose");

const shoppingListItemSchema = new mongoose.Schema(
	{
		household: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Household",
			required: true,
		},

		// Denormalized so the entry still reads correctly even if the
		// linked inventory item (sourceItem) is later renamed or deleted.
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

		unit: {
			type: String,
			trim: true,
			default: "pcs",
		},

		requestedQuantity: {
			type: Number,
			required: true,
			min: 1,
			default: 1,
		},

		// The inventory item this entry restocks, if it's tracked in
		// inventory at all. Auto-added entries always have this; manual
		// entries have it when the name matches an existing item.
		sourceItem: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Item",
			default: null,
		},

		// "auto" = created because an item dropped to low/out-of-stock.
		// "manual" = a household member added it directly.
		source: {
			type: String,
			enum: ["auto", "manual"],
			default: "manual",
		},

		status: {
			type: String,
			enum: ["pending", "claimed"],
			default: "pending",
		},

		addedBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},

		claimedBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			default: null,
		},
	},
	{
		timestamps: true,
	}
);

// Shopping list is almost always queried as "the full list for a household".
shoppingListItemSchema.index({ household: 1, createdAt: -1 });

module.exports = mongoose.model("ShoppingListItem", shoppingListItemSchema);
