const express = require("express");

const { getActivity } = require("../controllers/activityController");

// mergeParams so req.params.id (the household id from the parent router)
// is available here even though this router is mounted at "/:id/activity"
const router = express.Router({ mergeParams: true });

router.get("/", getActivity);

module.exports = router;
