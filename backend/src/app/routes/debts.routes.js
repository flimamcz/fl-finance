const express = require("express");
const { authenticate } = require("../middlewares/auth.middleware");
const {
  createDebt,
  deleteDebt,
  listDebts,
  payInstallment,
} = require("../controllers/Debt.controller");

const router = express.Router();

router.use(authenticate);
router.get("/", listDebts);
router.post("/", createDebt);
router.post("/installments/:installmentId/pay", payInstallment);
router.delete("/:id", deleteDebt);

module.exports = router;