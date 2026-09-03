const express = require("express");

const {
	getShoppingList,
	addShoppingListItem,
	claimItem,
	unclaimItem,
	purchaseItem,
	deleteShoppingListItem,
} = require("../controllers/shoppingListController");

// mergeParams exposes the household id from the parent router.
const router = express.Router({ mergeParams: true });

router.get("/", getShoppingList);
router.post("/", addShoppingListItem);
router.patch("/:itemId/claim", claimItem);
router.patch("/:itemId/unclaim", unclaimItem);
router.post("/:itemId/purchase", purchaseItem);
router.delete("/:itemId", deleteShoppingListItem);

module.exports = router;