const express = require("express");

const {
  createHousehold,
  joinHousehold,
  getHousehold,
  getHouseholdMembers,
  removeMember,
  leaveHousehold,
  getMyHousehold,
  getMyHouseholds,
  deleteHousehold,
} = require("../controllers/householdController");

const protect = require("../middleware/authMiddleware");
const checkHouseholdMember = require("../middleware/householdMiddleware");
const checkHouseholdOwner = require("../middleware/ownerMiddleware");
const itemRoutes = require("./itemRoutes");
const activityRoutes = require("./activityRoutes");

const router = express.Router();

router.post("/", protect, createHousehold);

router.get("/my-household", protect, getMyHousehold);

router.get("/my-households", protect, getMyHouseholds);

router.delete(
  "/:id",
  protect,
  checkHouseholdOwner,
  deleteHousehold
);

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

// Nested activity-log routes for this household — read-only, scoped
// to verified members the same way items are.
router.use(
  "/:id/activity",
  protect,
  checkHouseholdMember,
  activityRoutes
);

module.exports = router;
