const { Transaction } = require("../../models");

const searchTransactions = async () => {
  const transactions = await Transaction.findAll();

  if (!transactions) {
    return { error: "NOT FOUND", message: "Nenhuma transação encontrada!" };
  }

  return { error: null, message: transactions };
};

const createTransaction = async (dataTransaction) => {
  const newTransaction = await Transaction.create(dataTransaction);

  if (!newTransaction) {
    return { error: "Bad Request", message: "Erro ao criar transação!" };
  }
  return { error: null, message: newTransaction };
};

const updateTransaction = async (dataTransaction) => {
  const findTransaction = await Transaction.findOne({
    where: { id: dataTransaction.id },
  });
  if (!findTransaction)
    return { error: "NOT_FOUND", message: "Transação não encontrada!" };

  const transactionUpdated = await Transaction.update(dataTransaction, {
    where: {
      id: findTransaction.id,
    },
  });

  if (!transactionUpdated)
    return { error: "ERROR", message: "Error in update product" };

  return {
    error: null,
    message: `Sucess in update transaction with id ${dataTransaction.id}`,
  };
};

const deleteTransaction = async (id) => {
  const deletedTransaction = await Transaction.destroy({
    where: { id },
  });

  if (!deletedTransaction) {
    return {
      error: "Bad Request",
      message: `Erro ao deletar transação de ID ${id}!`,
    };
  }
  return { error: null, message: `Transação de ID ${id} deletada com sucesso` };
};

module.exports = {
  searchTransactions,
  createTransaction,
  deleteTransaction,
  updateTransaction,
};
