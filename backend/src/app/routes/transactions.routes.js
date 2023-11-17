const express = require("express");

const {
  searchTrasctions,
  createTrasaction,
  deleteTransaction,
} = require("../controllers/Transaction.controller");

const validateTransaction = require("../middlewares/Transaction.middleware");

const router = express.Router();

router.get("/", searchTrasctions);
router.post("/", validateTransaction.validateTransaction, createTrasaction);
router.delete("/:id", deleteTransaction);

module.exports = router;
