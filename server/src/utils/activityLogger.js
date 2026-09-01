const Activity = require("../models/Activity");

// Fire-and-forget style logger: activity history is a secondary concern,
// so a failure here should never cause the primary request (e.g. adding
// an item) to fail. We log the error and move on.
const logActivity = async ({
	household,
	item,
	itemName,
	user,
	action,
	message,
	previousQuantity,
	newQuantity,
	io,
}) => {
	try {
		const activity = await Activity.create({
			household,
			item,
			itemName,
			user,
			action,
			message,
			previousQuantity,
			newQuantity,
		});

		console.log("Activity logged successfully:", activity._id);

		if (io) {
			await activity.populate("user", "name email");

			io.to(`household:${household}`).emit("activity:new", {
				activity,
			});
		}

		return activity;
	} catch (error) {
		console.error("Activity log error:", error);
		console.error("Activity data:", {
			household,
			item,
			itemName,
			user,
			action,
			message,
			previousQuantity,
			newQuantity,
		});
	}
};

module.exports = logActivity;
