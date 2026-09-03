const mongoose = require("mongoose");
const ShoppingListItem = require("../models/ShoppingListItem");
const Item = require("../models/Item");
const logActivity = require("../utils/activityLogger");

const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getShoppingList = async (req, res) => {
	try {
		const shoppingList = await ShoppingListItem.find({
			household: req.params.id,
		})
			.sort({ createdAt: -1 })
			.populate("addedBy", "name email")
			.populate("claimedBy", "name email");

		res.status(200).json({
			message: "Shopping list retrieved successfully",
			shoppingList,
		});
	} catch (error) {
		console.error("Get shopping list error:", error);

		res.status(500).json({
			message: "Server error while retrieving shopping list",
		});
	}
};

const addShoppingListItem = async (req, res) => {
	try {
		const { name, category, unit, requestedQuantity } = req.body;

		if (!name || !name.trim()) {
			return res.status(400).json({
				message: "Item name is required",
			});
		}

		// Link a matching inventory item so purchasing can restock it.
		const sourceItem = await Item.findOne({
			household: req.params.id,
			name: new RegExp(`^${escapeRegExp(name.trim())}$`, "i"),
		});

		const entry = await ShoppingListItem.create({
			household: req.params.id,
			name: name.trim(),
			category: category || sourceItem?.category || "General",
			unit: unit || sourceItem?.unit || "pcs",
			requestedQuantity: requestedQuantity > 0 ? requestedQuantity : 1,
			sourceItem: sourceItem?._id || null,
			source: "manual",
			addedBy: req.user.userId,
		});

		await entry.populate("addedBy", "name email");

		const io = req.app.get("io");

		logActivity({
			household: req.params.id,
			item: sourceItem?._id,
			itemName: entry.name,
			user: req.user.userId,
			action: "shopping_item_added",
			message: `Added "${entry.name}" to the shopping list`,
			io,
		});

		io.to(`household:${req.params.id}`).emit("shopping:item_added", {
			item: entry,
		});

		res.status(201).json({
			message: "Item added to shopping list",
			item: entry,
		});
	} catch (error) {
		console.error("Add shopping list item error:", error);

		res.status(500).json({
			message: "Server error while adding to shopping list",
		});
	}
};

const claimItem = async (req, res) => {
	try {
		if (!mongoose.isValidObjectId(req.params.itemId)) {
			return res.status(400).json({
				message: "Invalid shopping list item ID",
			});
		}

		const entry = await ShoppingListItem.findOne({
			_id: req.params.itemId,
			household: req.params.id,
		});

		if (!entry) {
			return res.status(404).json({
				message: "Shopping list item not found",
			});
		}

		if (
			entry.status === "claimed" &&
			String(entry.claimedBy) !== String(req.user.userId)
		) {
			return res.status(409).json({
				message: "This item has already been claimed",
			});
		}

		entry.status = "claimed";
		entry.claimedBy = req.user.userId;

		await entry.save();
		await entry.populate("addedBy", "name email");
		await entry.populate("claimedBy", "name email");

		const io = req.app.get("io");

		logActivity({
			household: req.params.id,
			item: entry.sourceItem,
			itemName: entry.name,
			user: req.user.userId,
			action: "shopping_item_claimed",
			message: `Claimed "${entry.name}" from the shopping list`,
			io,
		});

		io.to(`household:${req.params.id}`).emit("shopping:item_claimed", {
			item: entry,
		});

		res.status(200).json({
			message: "Item claimed",
			item: entry,
		});
	} catch (error) {
		console.error("Claim shopping list item error:", error);

		res.status(500).json({
			message: "Server error while claiming item",
		});
	}
};

const unclaimItem = async (req, res) => {
	try {
		if (!mongoose.isValidObjectId(req.params.itemId)) {
			return res.status(400).json({
				message: "Invalid shopping list item ID",
			});
		}

		const entry = await ShoppingListItem.findOne({
			_id: req.params.itemId,
			household: req.params.id,
		});

		if (!entry) {
			return res.status(404).json({
				message: "Shopping list item not found",
			});
		}

		if (entry.status !== "claimed") {
			return res.status(400).json({
				message: "This item isn't claimed",
			});
		}

		if (String(entry.claimedBy) !== String(req.user.userId)) {
			return res.status(403).json({
				message: "Only the person who claimed this item can release it",
			});
		}

		entry.status = "pending";
		entry.claimedBy = null;

		await entry.save();
		await entry.populate("addedBy", "name email");

		const io = req.app.get("io");

		io.to(`household:${req.params.id}`).emit("shopping:item_unclaimed", {
			item: entry,
		});

		res.status(200).json({
			message: "Item released",
			item: entry,
		});
	} catch (error) {
		console.error("Unclaim shopping list item error:", error);

		res.status(500).json({
			message: "Server error while releasing item",
		});
	}
};

// Restock inventory by the purchased quantity, creating an item when needed.
const purchaseItem = async (req, res) => {
	try {
		if (!mongoose.isValidObjectId(req.params.itemId)) {
			return res.status(400).json({
				message: "Invalid shopping list item ID",
			});
		}

		const entry = await ShoppingListItem.findOne({
			_id: req.params.itemId,
			household: req.params.id,
		});

		if (!entry) {
			return res.status(404).json({
			message: "Shopping list item not found",
			});
		}

		const requestedQuantity = Number(req.body.quantity);
		const purchasedQuantity =
			Number.isFinite(requestedQuantity) && requestedQuantity > 0
				? requestedQuantity
				: entry.requestedQuantity;

		const io = req.app.get("io");
		let restockedItem = null;

		if (entry.sourceItem) {
			restockedItem = await Item.findOne({
				_id: entry.sourceItem,
				household: req.params.id,
			});
		}

		// Fall back to a name match for an entry created before its item existed.
		if (!restockedItem) {
			restockedItem = await Item.findOne({
				household: req.params.id,
				name: new RegExp(`^${escapeRegExp(entry.name)}$`, "i"),
			});
		}

		const previousQuantity = restockedItem?.quantity ?? 0;

		if (restockedItem) {
			restockedItem.quantity += purchasedQuantity;
			restockedItem.lastUpdatedBy = req.user.userId;

			await restockedItem.save();

			io.to(`household:${req.params.id}`).emit(
				"inventory:quantity_updated",
				{ item: restockedItem }
			);
		} else {
			restockedItem = await Item.create({
				household: req.params.id,
				name: entry.name,
				category: entry.category,
				quantity: purchasedQuantity,
				unit: entry.unit,
				addedBy: req.user.userId,
				lastUpdatedBy: req.user.userId,
			});

			io.to(`household:${req.params.id}`).emit("inventory:item_added", {
				item: restockedItem,
			});
		}

		await entry.deleteOne();

		logActivity({
			household: req.params.id,
			item: restockedItem._id,
			itemName: restockedItem.name,
			user: req.user.userId,
			action: "item_purchased",
			message: `Bought "${restockedItem.name}" - restocked from ${previousQuantity} to ${restockedItem.quantity}`,
			previousQuantity,
			newQuantity: restockedItem.quantity,
			io,
		});

		io.to(`household:${req.params.id}`).emit("shopping:item_removed", {
			itemId: entry._id,
		});

		res.status(200).json({
			message: "Item purchased and inventory restocked",
			item: restockedItem,
		});
	} catch (error) {
		console.error("Purchase shopping list item error:", error);

		res.status(500).json({
			message: "Server error while purchasing item",
		});
	}
};

const deleteShoppingListItem = async (req, res) => {
	try {
		if (!mongoose.isValidObjectId(req.params.itemId)) {
			return res.status(400).json({
				message: "Invalid shopping list item ID",
			});
		}

		const entry = await ShoppingListItem.findOneAndDelete({
			_id: req.params.itemId,
			household: req.params.id,
		});

		if (!entry) {
			return res.status(404).json({
				message: "Shopping list item not found",
			});
		}

		const io = req.app.get("io");

		io.to(`household:${req.params.id}`).emit("shopping:item_removed", {
			itemId: entry._id,
		});

		res.status(200).json({
			message: "Item removed from shopping list",
		});
	} catch (error) {
		console.error("Delete shopping list item error:", error);

		res.status(500).json({
			message: "Server error while removing item",
		});
	}
};

module.exports = {
	getShoppingList,
	addShoppingListItem,
	claimItem,
	unclaimItem,
	purchaseItem,
	deleteShoppingListItem,
};
