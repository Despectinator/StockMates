const Household = require("../models/Household");

const checkHouseholdMember = async (req, res, next) => {
  try {
    const householdId = req.params.id;
    const userId = req.user.userId;

    const household = await Household.findById(householdId);

    if (!household) {
      return res.status(404).json({
        message: "Household not found",
      });
    }

    const member = household.members.find(
      (member) => member.user.toString() === userId
    );

    if (!member) {
      return res.status(403).json({
        message: "You are not a member of this household",
      });
    }

    req.household = household;
    req.householdMember = member;

    next();
  } catch (error) {
    console.error("Household access error:", error);

    res.status(500).json({
      message: "Server error while checking household access",
    });
  }
};

module.exports = checkHouseholdMember;
