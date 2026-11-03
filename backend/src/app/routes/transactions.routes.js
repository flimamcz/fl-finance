const express = require("express");
const { authenticate } = require("../middlewares/auth.middleware");
const {
  searchTrasctions,
  createTrasaction,
  importTransactions,
  importBackup,
  deleteTransaction,
  updateTransaction,
  getCategoriesByType,
  getAllCategories,
  validateCategory,
} = require("../controllers/Transaction.controller");

const router = express.Router();

router.get("/", authenticate, searchTrasctions);
router.post("/", authenticate, createTrasaction);
router.post("/import", authenticate, importTransactions);
router.post("/import-backup", authenticate, importBackup);
router.patch("/", authenticate, updateTransaction);
router.delete("/:id", authenticate, deleteTransaction);
router.get("/categories", authenticate, getAllCategories);
router.get("/categories/:typeId", authenticate, getCategoriesByType);
router.post("/validate-category", authenticate, validateCategory);

module.exports = router;
