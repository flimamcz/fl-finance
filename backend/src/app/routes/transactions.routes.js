const express = require("express");

const {
  searchTrasctions,
  createTrasaction,
  deleteTransaction,
  updateTransaction,
} = require("../controllers/Transaction.controller");

const validateTransaction = require("../middlewares/Transaction.middleware");

const router = express.Router();

router.get("/", searchTrasctions);
router.post("/", createTrasaction);
router.patch("/", updateTransaction);
router.delete("/:id", deleteTransaction);

module.exports = router;
