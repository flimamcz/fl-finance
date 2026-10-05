const express = require("express");
const { authenticate } = require("../middlewares/auth.middleware");
const {
  createDebt,
  deleteDebt,
  listDebts,
  payInstallment,
  settleDebt,
  updateDebt,
  updateInstallment,
} = require("../controllers/Debt.controller");

const router = express.Router();

router.use(authenticate);
router.get("/", listDebts);
router.post("/", createDebt);
router.put("/:id", updateDebt);
router.post("/:id/settle", settleDebt);
router.post("/installments/:installmentId/pay", payInstallment);
router.put("/installments/:installmentId", updateInstallment);
router.delete("/:id", deleteDebt);

module.exports = router;