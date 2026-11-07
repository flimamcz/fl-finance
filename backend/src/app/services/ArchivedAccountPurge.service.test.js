"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { Op } = require("sequelize");
const {
  Debt,
  DebtInstallment,
  InvestmentMovement,
  Transaction,
  User,
  sequelize,
} = require("../../models");
const { purgeExpiredArchivedAccounts } = require("./ArchivedAccountPurge.service");

test("purger removes linked financial rows before permanently deleting expired accounts", async () => {
  const originals = {
    transaction: sequelize.transaction,
    userFindAll: User.findAll,
    userFindByPk: User.findByPk,
    debtFindAll: Debt.findAll,
    debtDestroy: Debt.destroy,
    installmentDestroy: DebtInstallment.destroy,
    movementFindAll: InvestmentMovement.findAll,
    movementDestroy: InvestmentMovement.destroy,
    transactionFindAll: Transaction.findAll,
    transactionDestroy: Transaction.destroy,
  };
  const deletionOrder = [];
  const archivedAt = new Date("2025-01-01T00:00:00.000Z");
  const cutoffNow = new Date("2025-02-01T00:00:00.000Z");

  sequelize.transaction = async (callback) => callback({ LOCK: { UPDATE: "UPDATE" } });
  User.findAll = async (options) => {
    assert.equal(options.paranoid, false);
    assert.equal(options.where.deletedAt[Op.lte].getTime(),
      cutoffNow.getTime() - 30 * 24 * 60 * 60 * 1000);
    return [{ id: 7 }];
  };
  User.findByPk = async () => ({
    deletedAt: archivedAt,
    async destroy(options) {
      assert.equal(options.force, true);
      deletionOrder.push("user");
    },
  });
  Debt.findAll = async () => [{ id: 11 }];
  Debt.destroy = async () => { deletionOrder.push("debts"); };
  DebtInstallment.destroy = async () => { deletionOrder.push("installments"); };
  InvestmentMovement.findAll = async () => [{ transaction_id: 19 }];
  InvestmentMovement.destroy = async () => { deletionOrder.push("movements"); };
  Transaction.findAll = async ({ where }) => (
    where.user_id === 7 ? [{ id: 19 }] : [{ id: 19 }]
  );
  Transaction.destroy = async () => { deletionOrder.push("transactions"); };

  try {
    const count = await purgeExpiredArchivedAccounts(cutoffNow);
    assert.equal(count, 1);
    assert.deepEqual(deletionOrder, ["movements", "installments", "debts", "transactions", "user"]);
  } finally {
    sequelize.transaction = originals.transaction;
    User.findAll = originals.userFindAll;
    User.findByPk = originals.userFindByPk;
    Debt.findAll = originals.debtFindAll;
    Debt.destroy = originals.debtDestroy;
    DebtInstallment.destroy = originals.installmentDestroy;
    InvestmentMovement.findAll = originals.movementFindAll;
    InvestmentMovement.destroy = originals.movementDestroy;
    Transaction.findAll = originals.transactionFindAll;
    Transaction.destroy = originals.transactionDestroy;
  }
});
