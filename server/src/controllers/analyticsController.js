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

// Household-level descriptive analytics: consumption history & trends,
// contribution/replenishment history per member, most/least consumed
// items, average replenishment interval, and a day-by-day usage series
// for charting. Built entirely from the Activity log plus the current
// Item list — no separate aggregation table to keep in sync.
const getHouseholdStats = async (req, res) => {
	try {
		const householdId = req.params.id;

		const [items, activities] = await Promise.all([
			Item.find({ household: householdId }),
			Activity.find({ household: householdId })
				.sort({ createdAt: 1 })
				.populate("user", "name email"),
		]);

		const itemMeta = new Map(
			items.map((item) => [
				item._id.toString(),
				{ name: item.name, unit: item.unit },
			])
		);

		const consumedByItem = new Map(); // itemId -> total quantity consumed
		const replenishmentDatesByItem = new Map(); // itemId -> [Date]
		const contributionsByUser = new Map(); // userId -> summary
		const replenishmentHistory = [];
		const consumptionByDay = new Map(); // 'YYYY-MM-DD' -> { events, quantity }

		const ensureContributor = (userDoc) => {
			const id = userDoc?._id?.toString() || "unknown";
			if (!contributionsByUser.has(id)) {
				contributionsByUser.set(id, {
					userId: id,
					name: userDoc?.name || "Unknown",
					itemsAdded: 0,
					purchases: 0,
					quantityRestocked: 0,
				});
			}
			return contributionsByUser.get(id);
		};

		for (const entry of activities) {
			const itemId = entry.item ? entry.item.toString() : null;
			const meta = itemId ? itemMeta.get(itemId) : null;

			if (entry.action === "item_added" && entry.user) {
				ensureContributor(entry.user).itemsAdded += 1;
			}

			const hasQuantities =
				entry.previousQuantity !== null &&
				entry.previousQuantity !== undefined &&
				entry.newQuantity !== null &&
				entry.newQuantity !== undefined;

			if (!hasQuantities || !itemId) continue;

			const delta = entry.newQuantity - entry.previousQuantity;
			if (delta === 0) continue;

			if (delta < 0) {
				// Consumption — quantity went down.
				consumedByItem.set(itemId, (consumedByItem.get(itemId) || 0) - delta);

				const day = entry.createdAt.toISOString().slice(0, 10);
				const bucket = consumptionByDay.get(day) || { events: 0, quantity: 0 };
				bucket.events += 1;
				bucket.quantity += -delta;
				consumptionByDay.set(day, bucket);
			} else {
				// Replenishment — quantity went up (purchase or manual restock).
				if (!replenishmentDatesByItem.has(itemId)) {
					replenishmentDatesByItem.set(itemId, []);
				}
				replenishmentDatesByItem.get(itemId).push(entry.createdAt);

				if (entry.user) {
					const contributor = ensureContributor(entry.user);
					contributor.quantityRestocked += delta;
					if (entry.action === "item_purchased") contributor.purchases += 1;
				}

				replenishmentHistory.push({
					itemId,
					itemName: meta?.name || entry.itemName || "Unknown item",
					unit: meta?.unit || "",
					quantity: delta,
					userId: entry.user?._id?.toString() || null,
					userName: entry.user?.name || "Unknown",
					date: entry.createdAt,
				});
			}
		}

		// Most / least consumed items.
		const consumedList = items.map((item) => ({
			itemId: item._id.toString(),
			name: item.name,
			unit: item.unit,
			totalConsumed:
				Math.round((consumedByItem.get(item._id.toString()) || 0) * 10) / 10,
		}));
		const consumedDesc = [...consumedList].sort(
			(a, b) => b.totalConsumed - a.totalConsumed
		);
		const mostConsumed = consumedDesc
			.filter((row) => row.totalConsumed > 0)
			.slice(0, 5);
		const leastConsumed = [...consumedDesc].reverse().slice(0, 5);

		// Average replenishment interval — per item, and pooled overall.
		const allIntervals = [];
		const perItemAvgReplenishmentInterval = [];
		for (const [itemId, dates] of replenishmentDatesByItem.entries()) {
			if (dates.length < 2) continue;
			const sorted = [...dates].sort((a, b) => a - b);
			const intervals = [];
			for (let i = 1; i < sorted.length; i++) {
				intervals.push((sorted[i] - sorted[i - 1]) / 86400000);
			}
			const avg =
				intervals.reduce((sum, value) => sum + value, 0) / intervals.length;
			allIntervals.push(...intervals);
			perItemAvgReplenishmentInterval.push({
				itemId,
				name: itemMeta.get(itemId)?.name || "Unknown item",
				avgDays: Math.round(avg * 10) / 10,
			});
		}
		const avgReplenishmentIntervalDays =
			allIntervals.length > 0
				? Math.round(
						(allIntervals.reduce((sum, value) => sum + value, 0) /
							allIntervals.length) *
							10
				  ) / 10
				: null;

		// Day-by-day usage series for the last 14 days, including empty days
		// so the chart doesn't have gaps.
		const usageOverTime = [];
		for (let i = 13; i >= 0; i--) {
			const date = new Date();
			date.setUTCHours(0, 0, 0, 0);
			date.setUTCDate(date.getUTCDate() - i);
			const key = date.toISOString().slice(0, 10);
			const bucket = consumptionByDay.get(key) || { events: 0, quantity: 0 };
			usageOverTime.push({
				date: key,
				events: bucket.events,
				quantity: Math.round(bucket.quantity * 10) / 10,
			});
		}

		const totals = {
			totalItems: items.length,
			inStock: items.filter((item) => item.status === "in-stock").length,
			lowStock: items.filter((item) => item.status === "low-stock").length,
			outOfStock: items.filter((item) => item.status === "out-of-stock")
				.length,
			totalConsumptionEvents: [...consumptionByDay.values()].reduce(
				(sum, bucket) => sum + bucket.events,
				0
			),
			totalReplenishments: replenishmentHistory.length,
		};

		res.status(200).json({
			message: "Household stats retrieved successfully",
			stats: {
				totals,
				mostConsumed,
				leastConsumed,
				contributions: [...contributionsByUser.values()].sort(
					(a, b) =>
						b.quantityRestocked +
						b.itemsAdded -
						(a.quantityRestocked + a.itemsAdded)
				),
				replenishmentHistory: replenishmentHistory.slice(-20).reverse(),
				avgReplenishmentIntervalDays,
				perItemAvgReplenishmentInterval:
					perItemAvgReplenishmentInterval.sort(
						(a, b) => a.avgDays - b.avgDays
					),
				usageOverTime,
			},
		});
	} catch (error) {
		console.error("Get household stats error:", error);

		res.status(500).json({
			message: "Server error while computing household stats",
		});
	}
};

module.exports = { getPredictions, getHouseholdStats };
