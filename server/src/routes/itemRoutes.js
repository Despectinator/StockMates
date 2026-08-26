const express = require("express");

const {
	createItem,
	getItems,
	getItem,
	updateItem,
	updateQuantity,
	deleteItem,
} = require("../controllers/itemController");

// mergeParams so req.params.id (the household id from the parent router)
// is available here even though this router is mounted at "/:id/items"
const router = express.Router({ mergeParams: true });

router.post("/", createItem);
router.get("/", getItems);
router.get("/:itemId", getItem);
router.patch("/:itemId", updateItem);
router.patch("/:itemId/quantity", updateQuantity);
router.delete("/:itemId", deleteItem);

module.exports = router;
