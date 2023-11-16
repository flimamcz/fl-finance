const { Transaction } = require("../../models");

const searchTransactions = async () => {
  const transactions = await Transaction.findAll();

  return { error: null, message: transactions };
};

const createTransaction = async (dataTransaction) => {
  const newTransaction = await Transaction.create(dataTransaction);

  return { error: null, message: newTransaction };
};

module.exports = { searchTransactions, createTransaction };
