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

const deleteTransaction = async (id) => {
  const deletedTransaction = await Transaction.destroy({
    where: { id },
  });

  console.log(id);
  console.log(deleteTransaction);

  if (!deletedTransaction) {
    return {
      error: "Bad Request",
      message: `Erro ao deletar transação de ID ${id}!`,
    };
  }
  return { error: null, message: `Transação de ID ${id} deletada com sucesso` };
};

module.exports = { searchTransactions, createTransaction, deleteTransaction };
