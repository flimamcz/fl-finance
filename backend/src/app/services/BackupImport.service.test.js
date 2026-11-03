"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  Category,
  Debt,
  DebtInstallment,
  InvestmentMovement,
  Transaction,
  sequelize,
} = require("../../models");
const { importBackup } = require("./BackupImport.service");

test("restores all backup groups and reconnects ledger, debt, and investment records", async () => {
  const originals = {
    categoryFindAll: Category.findAll,
    categoryCreate: Category.create,
    debtFindAll: Debt.findAll,
    debtCreate: Debt.create,
    installmentCreate: DebtInstallment.create,
    transactionFindAll: Transaction.findAll,
    transactionCreate: Transaction.create,
    movementFindOne: InvestmentMovement.findOne,
    movementCreate: InvestmentMovement.create,
    databaseTransaction: sequelize.transaction,
  };
  const createdCategories = [];
  const createdInstallments = [];
  const createdTransactions = [];
  const createdMovements = [];
  let nextId = 1;

  Category.findAll = async () => [];
  Category.create = async (data) => {
    const category = { id: nextId++, ...data };
    createdCategories.push(category);
    return category;
  };
  Debt.findAll = async () => [];
  Debt.create = async (data) => ({ id: nextId++, ...data, installments: [] });
  DebtInstallment.create = async (data) => {
    const installment = {
      id: nextId++,
      ...data,
      async update(values) {
        Object.assign(this, values);
      },
    };
    createdInstallments.push(installment);
    return installment;
  };
  Transaction.findAll = async () => [];
  Transaction.create = async (data) => {
    const transaction = { id: nextId++, ...data };
    createdTransactions.push(transaction);
    return transaction;
  };
  InvestmentMovement.findOne = async () => null;
  InvestmentMovement.create = async (data) => {
    createdMovements.push(data);
    return data;
  };
  sequelize.transaction = async (callback) => callback({ LOCK: { UPDATE: "UPDATE" } });

  try {
    const result = await importBackup(2, {
      categories: [{ sourceId: "50", name: "Casa", typeId: 2, icon: "home", color: "#123456" }],
      debts: [{
        sourceId: "20",
        name: "Empréstimo",
        creditor: "Banco",
        amount: 100,
        firstDueDate: "2026-11-07",
        recurring: false,
        installmentCount: 1,
      }],
      transactions: [
        {
          sourceId: "10",
          date: "2026-11-03",
          description: "Dívida: Empréstimo (1/1)",
          value: 100,
          typeId: 2,
          status: true,
          isSalary: false,
          category: "Casa",
        },
        {
          sourceId: "11",
          date: "2026-11-03",
          description: "Aporte em investimentos: Mensal",
          value: 50,
          typeId: 3,
          status: true,
          isSalary: false,
          category: "",
        },
      ],
      installments: [{
        sourceId: "30",
        debtSourceId: "20",
        installmentNumber: 1,
        dueDate: "2026-11-07",
        amount: 100,
        status: "paid",
        autoSettle: true,
        transactionSourceId: "10",
        paidAt: "2026-11-03T10:00:00.000Z",
      }],
      investments: [{
        sourceId: "40",
        transactionSourceId: "11",
        date: "2026-11-03",
        description: "Mensal",
        amount: 50,
        type: "contribution",
      }],
    });

    assert.deepEqual(result, {
      transactions: 2,
      debts: 1,
      installments: 1,
      investments: 1,
      categories: 1,
    });
    assert.equal(createdCategories[0].name, "Casa");
    assert.equal(createdInstallments[0].status, "paid");
    assert.equal(createdInstallments[0].transaction_id, createdTransactions[0].id);
    assert.equal(createdMovements[0].transaction_id, createdTransactions[1].id);
    assert.equal(createdTransactions[0].category_id, createdCategories[0].id);
  } finally {
    Category.findAll = originals.categoryFindAll;
    Category.create = originals.categoryCreate;
    Debt.findAll = originals.debtFindAll;
    Debt.create = originals.debtCreate;
    DebtInstallment.create = originals.installmentCreate;
    Transaction.findAll = originals.transactionFindAll;
    Transaction.create = originals.transactionCreate;
    InvestmentMovement.findOne = originals.movementFindOne;
    InvestmentMovement.create = originals.movementCreate;
    sequelize.transaction = originals.databaseTransaction;
  }
});
