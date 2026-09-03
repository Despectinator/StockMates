const ShoppingListItem = require("../models/ShoppingListItem");

// Keeps the shopping list in sync with an item's stock status: adds a
// pending auto-entry when an item goes low/out-of-stock, and clears any
// existing auto-entry once it's back to a healthy quantity - e.g. because
// someone edited the quantity directly rather than through the shopping
// list's purchase flow. Called after any save() that can change item.status.
const syncShoppingListForItem = async (item, io) => {
	try {
		const householdId = item.household.toString();

		if (item.status === "low-stock" || item.status === "out-of-stock") {
			const existing = await ShoppingListItem.findOne({
				household: item.household,
				sourceItem: item._id,
			});

			if (existing) return; // already on the list, nothing to do

			const requestedQuantity = Math.max(
				item.lowStockThreshold - item.quantity,
				1
			);

			const entry = await ShoppingListItem.create({
				household: item.household,
				name: item.name,
				category: item.category,
				unit: item.unit,
				requestedQuantity,
				sourceItem: item._id,
				source: "auto",
				addedBy: item.lastUpdatedBy || item.addedBy,
			});

			await entry.populate("addedBy", "name email");

			if (io) {
				io.to(`household:${householdId}`).emit("shopping:item_added", {
					item: entry,
				});
			}
		} else {
			const removed = await ShoppingListItem.findOneAndDelete({
				household: item.household,
				sourceItem: item._id,
				source: "auto",
			});

			if (removed && io) {
				io.to(`household:${householdId}`).emit("shopping:item_removed", {
					itemId: removed._id,
				});
			}
		}
	} catch (error) {
		console.error("Shopping list sync error:", error);
	}
};

// Called when an inventory item is deleted outright - any shopping list
// entry pointing at it would otherwise be left dangling.
const removeShoppingListEntryForItem = async (itemId, householdId, io) => {
	try {
		const removed = await ShoppingListItem.findOneAndDelete({
			household: householdId,
			sourceItem: itemId,
		});

		if (removed && io) {
			io.to(`household:${householdId}`).emit("shopping:item_removed", {
				itemId: removed._id,
			});
		}
	} catch (error) {
		console.error("Shopping list cleanup error:", error);
	}
};

module.exports = { syncShoppingListForItem, removeShoppingListEntryForItem };
