const Item = require("../models/Item");
const mongoose = require("mongoose");
const logActivity = require("../utils/activityLogger");
const {
	syncShoppingListForItem,
	removeShoppingListEntryForItem,
} = require("../utils/shoppingListSync");

const createItem = async (req, res) => {
	try {
		const { name, category, quantity, unit, lowStockThreshold } = req.body;

		if (!name || !name.trim()) {
			return res.status(400).json({
				message: "Item name is required",
			});
		}

		const item = await Item.create({
			household: req.params.id,
			name: name.trim(),
			category,
			quantity: quantity ?? 0,
			unit,
			lowStockThreshold: lowStockThreshold ?? 1,
			addedBy: req.user.userId,
			lastUpdatedBy: req.user.userId,
		});

		const io = req.app.get("io");
		await syncShoppingListForItem(item, io);

		logActivity({
			household: req.params.id,
			item: item._id,
			itemName: item.name,
			user: req.user.userId,
			action: "item_added",
			message: `Added "${item.name}" — ${item.quantity} ${item.unit}`,
			newQuantity: item.quantity,
			io,
		});

		io.to(`household:${req.params.id}`).emit("inventory:item_added", {
			item,
		});

		res.status(201).json({
			message: "Item added successfully",
			item,
		});
	} catch (error) {
		console.error("Create item error:", error);

		res.status(500).json({
			message: "Server error while adding item",
		});
	}
};

const getItems = async (req, res) => {
	try {
		const items = await Item.find({ household: req.params.id }).sort({
			createdAt: -1,
		});

		res.status(200).json({
			message: "Items retrieved successfully",
			items,
		});
	} catch (error) {
		console.error("Get items error:", error);

		res.status(500).json({
			message: "Server error while retrieving items",
		});
	}
};

const getItem = async (req, res) => {
	try {
		if (!mongoose.isValidObjectId(req.params.itemId)) {
			return res.status(400).json({
				message: "Invalid item ID",
			});
		}

		const item = await Item.findOne({
			_id: req.params.itemId,
			household: req.params.id,
		});

		if (!item) {
			return res.status(404).json({
				message: "Item not found",
			});
		}

		res.status(200).json({
			message: "Item retrieved successfully",
			item,
		});
	} catch (error) {
		console.error("Get item error:", error);

		res.status(500).json({
			message: "Server error while retrieving item",
		});
	}
};

const updateItem = async (req, res) => {
	try {
		if (!mongoose.isValidObjectId(req.params.itemId)) {
			return res.status(400).json({
				message: "Invalid item ID",
			});
		}

		const { name, category, unit, lowStockThreshold } = req.body;

		const item = await Item.findOne({
			_id: req.params.itemId,
			household: req.params.id,
		});

		if (!item) {
			return res.status(404).json({
				message: "Item not found",
			});
		}

		if (name !== undefined) item.name = name.trim();
		if (category !== undefined) item.category = category;
		if (unit !== undefined) item.unit = unit;
		if (lowStockThreshold !== undefined) {
			item.lowStockThreshold = lowStockThreshold;
		}

		item.lastUpdatedBy = req.user.userId;

		await item.save();

		const io = req.app.get("io");
		await syncShoppingListForItem(item, io);

		logActivity({
			household: req.params.id,
			item: item._id,
			itemName: item.name,
			user: req.user.userId,
			action: "item_updated",
			message: `Updated details for "${item.name}"`,
			io,
		});

		io.to(`household:${req.params.id}`).emit("inventory:item_updated", {
			item,
		});

		res.status(200).json({
			message: "Item updated successfully",
			item,
		});
	} catch (error) {
		console.error("Update item error:", error);

		res.status(500).json({
			message: "Server error while updating item",
		});
	}
};

// Separate endpoint for quantity changes since this is the action that
// happens far more often than editing an item's other details, and it's
// the one that needs to recompute low/out-of-stock status every time.
const updateQuantity = async (req, res) => {
	try {
		if (!mongoose.isValidObjectId(req.params.itemId)) {
			return res.status(400).json({
				message: "Invalid item ID",
			});
		}

		const { quantity } = req.body;

		if (quantity === undefined || quantity === null || quantity < 0) {
			return res.status(400).json({
				message: "A valid, non-negative quantity is required",
			});
		}

		const item = await Item.findOne({
			_id: req.params.itemId,
			household: req.params.id,
		});

		if (!item) {
			return res.status(404).json({
				message: "Item not found",
			});
		}

		const previousQuantity = item.quantity;

		item.quantity = quantity;
		item.lastUpdatedBy = req.user.userId;

		await item.save();

		const io = req.app.get("io");
		await syncShoppingListForItem(item, io);

		logActivity({
			household: req.params.id,
			item: item._id,
			itemName: item.name,
			user: req.user.userId,
			action: "quantity_updated",
			message: `Changed quantity of "${item.name}" from ${previousQuantity} to ${item.quantity}`,
			previousQuantity,
			newQuantity: item.quantity,
			io,
		});

		io.to(`household:${req.params.id}`).emit("inventory:quantity_updated", {
			item,
			previousQuantity,
			newQuantity: item.quantity,
		});

		res.status(200).json({
			message: "Item quantity updated successfully",
			item,
		});
	} catch (error) {
		console.error("Update quantity error:", error);

		res.status(500).json({
			message: "Server error while updating item quantity",
		});
	}
};

const deleteItem = async (req, res) => {
	try {
		if (!mongoose.isValidObjectId(req.params.itemId)) {
			return res.status(400).json({
				message: "Invalid item ID",
			});
		}

		const item = await Item.findOneAndDelete({
			_id: req.params.itemId,
			household: req.params.id,
		});

		if (!item) {
			return res.status(404).json({
				message: "Item not found",
			});
		}

		const io = req.app.get("io");
		await removeShoppingListEntryForItem(item._id, item.household, io);

		logActivity({
			household: req.params.id,
			item: item._id,
			itemName: item.name,
			user: req.user.userId,
			action: "item_removed",
			message: `Removed "${item.name}" from inventory`,
			previousQuantity: item.quantity,
			io,
		});

		io.to(`household:${req.params.id}`).emit("inventory:item_removed", {
			itemId: item._id,
		});

		res.status(200).json({
			message: "Item removed successfully",
		});
	} catch (error) {
		console.error("Delete item error:", error);

		res.status(500).json({
			message: "Server error while removing item",
		});
	}
};

module.exports = {
	createItem,
	getItems,
	getItem,
	updateItem,
	updateQuantity,
	deleteItem,
};
