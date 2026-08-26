const express = require("express");

const {
  createHousehold,
  joinHousehold,
  getHousehold,
  getHouseholdMembers,
  removeMember,
  leaveHousehold,
} = require("../controllers/householdController");

const protect = require("../middleware/authMiddleware");
const checkHouseholdMember = require("../middleware/householdMiddleware");
const checkHouseholdOwner = require("../middleware/ownerMiddleware");
const itemRoutes = require("./itemRoutes");

const router = express.Router();

router.post("/", protect, createHousehold);

router.post("/:id/join", protect, joinHousehold);

router.get(
  "/:id",
  protect,
  checkHouseholdMember,
  getHousehold
);

router.get(
  "/:id/members",
  protect,
  checkHouseholdMember,
  getHouseholdMembers
);

router.delete(
  "/:id/members/:userId",
  protect,
  checkHouseholdOwner,
  removeMember
);

router.delete(
  "/:id/leave",
  protect,
  leaveHousehold
);

// Nested inventory item routes for this household.
// checkHouseholdMember runs once here so every item route below is
// already scoped to a verified member of this household.
router.use(
  "/:id/items",
  protect,
  checkHouseholdMember,
  itemRoutes
);

module.exports = router;
