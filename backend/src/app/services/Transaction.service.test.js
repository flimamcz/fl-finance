"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { Debt, DebtInstallment, Transaction } = require("../../models");
const transactionService = require("./Transaction.service");

test("import links confirmed matching debt payments and skips already represented installments", async () => {
  const originals = {
    findDebts: Debt.findAll,
    updateInstallment: DebtInstallment.update,
    bulkCreate: Transaction.bulkCreate,
    databaseTransaction: Transaction.sequelize.transaction,
  };
  const installments = [
    {
      id: 21,
      installment_number: 1,
      amount: "439.79",
      due_date: "2026-11-07",
      status: "pending",
      transaction_id: null,
    },
    {
      id: 22,
      installment_number: 2,
      amount: "347.73",
      due_date: "2026-11-07",
      status: "paid",
      transaction_id: 501,
    },
  ];
  const debts = [
    {
      id: 9,
      name: "EMPRESTIMO 698312815",
      creditor: "BANCO",
      installment_count: 24,
      installments: [installments[0]],
    },
    {
      id: 10,
      name: "EMPRESTIMO 697035200",
      creditor: "BANCO",
      installment_count: 3,
      installments: [installments[1]],
    },
  ];
  const updated = [];
  let insertedRows = [];

  Debt.findAll = async () => debts;
  DebtInstallment.update = async (values, options) => {
    updated.push({ values, options });
    return [1];
  };
  Transaction.bulkCreate = async (rows) => {
    insertedRows = rows;
    return rows.map((row, index) => ({ id: 700 + index, ...row }));
  };
  Transaction.sequelize.transaction = async (callback) =>
    callback({ LOCK: { UPDATE: "UPDATE" } });

  try {
    const result = await transactionService.createTransactionsBatch(2, [
      {
        value: 439.79,
        typeId: 2,
        description: "Dívida: EMPRESTIMO 698312815 (1/24)",
        date: "2026-11-07",
        status: true,
        isSalary: false,
      },
      {
        value: 439.79,
        typeId: 2,
        description: "EMPRESTIMO 698312815 (1/24)",
        date: "2026-11-07",
        status: true,
        isSalary: false,
      },
      {
        value: 347.73,
        typeId: 2,
        description: "EMPRESTIMO 697035200 (2/3)",
        date: "2026-11-07",
        status: true,
        isSalary: false,
      },
      {
        value: 25,
        typeId: 2,
        description: "Compra no mercado",
        date: "2026-11-07",
        status: true,
        isSalary: false,
      },
    ]);

    assert.equal(result.error, null);
    assert.equal(result.count, 2);
    assert.equal(result.skippedDebtInstallments, 2);
    assert.equal(result.linkedDebtInstallments, 1);
    assert.equal(insertedRows.length, 2);
    assert.equal(updated.length, 1);
    assert.equal(updated[0].values.status, "paid");
    assert.equal(updated[0].values.transaction_id, 700);
    assert.ok(updated[0].values.paid_at instanceof Date);
    assert.equal(updated[0].values.auto_settle, true);
    assert.equal(updated[0].options.where.id, 21);
    assert.equal(updated[0].options.where.transaction_id, null);
  } finally {
    Debt.findAll = originals.findDebts;
    DebtInstallment.update = originals.updateInstallment;
    Transaction.bulkCreate = originals.bulkCreate;
    Transaction.sequelize.transaction = originals.databaseTransaction;
  }
});

test("import skips a pending debt installment instead of creating a second future expense", async () => {
  const originals = {
    findDebts: Debt.findAll,
    updateInstallment: DebtInstallment.update,
    bulkCreate: Transaction.bulkCreate,
    databaseTransaction: Transaction.sequelize.transaction,
  };
  Debt.findAll = async () => [{
    id: 9,
    name: "EMPRESTIMO 698312815",
    creditor: "BANCO",
    installment_count: 24,
    installments: [{
      id: 21,
      installment_number: 3,
      amount: "439.79",
      due_date: "2026-12-07",
      status: "pending",
      transaction_id: null,
    }],
  }];
  DebtInstallment.update = async () => {
    throw new Error("A parcela pendente não deve ser marcada como paga.");
  };
  Transaction.bulkCreate = async () => [];
  Transaction.sequelize.transaction = async (callback) =>
    callback({ LOCK: { UPDATE: "UPDATE" } });

  try {
    const result = await transactionService.createTransactionsBatch(2, [{
      value: 439.79,
      typeId: 2,
      description: "EMPRESTIMO 698312815",
      date: "2026-12-07",
      status: false,
      isSalary: false,
    }]);

    assert.equal(result.error, null);
    assert.equal(result.count, 0);
    assert.equal(result.skippedDebtInstallments, 1);
    assert.equal(result.linkedDebtInstallments, 0);
    assert.deepEqual(result, {
      error: null,
      count: 0,
      skippedDebtInstallments: 1,
      linkedDebtInstallments: 0,
    });
  } finally {
    Debt.findAll = originals.findDebts;
    DebtInstallment.update = originals.updateInstallment;
    Transaction.bulkCreate = originals.bulkCreate;
    Transaction.sequelize.transaction = originals.databaseTransaction;
  }
});
