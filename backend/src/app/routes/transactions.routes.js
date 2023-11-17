const express = require("express");

const {
  searchTrasctions,
  createTrasaction,
  deleteTransaction,
} = require("../controllers/Transaction.controller");

const router = express.Router();

router.get("/", searchTrasctions);
router.post("/", createTrasaction);
router.delete("/:id", deleteTransaction);

module.exports = router;
