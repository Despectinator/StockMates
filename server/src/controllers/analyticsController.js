const Item = require("../models/Item");
const Activity = require("../models/Activity");

const ANALYTICS_SERVICE_URL =
	process.env.ANALYTICS_SERVICE_URL || "http://127.0.0.1:8001";

// Every activity action that records a quantity snapshot — the only
// entries useful for fitting a consumption trend.
const QUANTITY_ACTIONS = ["item_added", "quantity_updated", "item_purchased"];

const getPredictions = async (req, res) => {
	try {
		const items = await Item.find({ household: req.params.id });

		if (items.length === 0) {
			return res.status(200).json({ predictions: [] });
		}

		// One query for every item's history, rather than one query per
		// item — grouped in memory below.
		const historyEntries = await Activity.find({
			household: req.params.id,
			action: { $in: QUANTITY_ACTIONS },
			item: { $ne: null },
			newQuantity: { $ne: null },
		})
			.sort({ createdAt: 1 })
			.select("item newQuantity createdAt");

		const historyByItem = new Map();
		for (const entry of historyEntries) {
			const itemId = entry.item.toString();
			if (!historyByItem.has(itemId)) historyByItem.set(itemId, []);
			historyByItem.get(itemId).push({
				date: entry.createdAt,
				quantity: entry.newQuantity,
			});
		}

		const payload = {
			items: items.map((item) => ({
				itemId: item._id.toString(),
				history: historyByItem.get(item._id.toString()) || [],
				currentQuantity: item.quantity,
				lowStockThreshold: item.lowStockThreshold,
			})),
		};

		const response = await fetch(`${ANALYTICS_SERVICE_URL}/predict/batch`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			throw new Error(`Analytics service responded with ${response.status}`);
		}

		const { results } = await response.json();

		res.status(200).json({
			message: "Predictions retrieved successfully",
			predictions: results,
		});
	} catch (error) {
		console.error("Get predictions error:", error);

		res.status(502).json({
			message:
				"Could not reach the analytics service. Make sure it's running.",
		});
	}
};

module.exports = { getPredictions };
