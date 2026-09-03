const express = require("express");

const { getPredictions } = require("../controllers/analyticsController");

// mergeParams so req.params.id (the household id from the parent router)
// is available here even though this router is mounted at "/:id/analytics"
const router = express.Router({ mergeParams: true });

router.get("/predictions", getPredictions);

module.exports = router;
