const Household = require("../models/Household");

const checkHouseholdOwner = async (req, res, next) => {
  try {
    const householdId = req.params.id;
    const userId = req.user.userId;

    const household = await Household.findById(householdId);

    if (!household) {
      return res.status(404).json({
        message: "Household not found",
      });
    }

    if (household.owner.toString() !== userId) {
      return res.status(403).json({
        message: "Only the household owner can perform this action",
      });
    }

    req.household = household;

    next();
  } catch (error) {
    console.error("Owner authorization error:", error);

    res.status(500).json({
      message: "Server error while checking owner authorization",
    });
  }
};

module.exports = checkHouseholdOwner;
