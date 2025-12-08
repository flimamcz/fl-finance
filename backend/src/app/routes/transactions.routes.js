const express = require("express");
const { authenticate } = require('../middlewares/auth.middleware');


const {
  searchTrasctions,
  createTrasaction,
  deleteTransaction,
  updateTransaction,
} = require("../controllers/Transaction.controller");

const validateTransaction = require("../middlewares/Transaction.middleware");

const router = express.Router();

router.get("/", authenticate, searchTrasctions);
router.post("/", authenticate, createTrasaction);
router.patch("/", authenticate, updateTransaction);
router.delete("/:id", authenticate, deleteTransaction);

module.exports = router;
