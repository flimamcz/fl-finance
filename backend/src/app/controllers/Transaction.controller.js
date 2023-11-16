const transactionService = require("../services/Transaction.service");

const searchTrasctions = async (req, res) => {
  const { error, message } = await transactionService.searchTransactions();

  return res.status(200).json(message);
};

const createTrasaction = async (req, res) => {
  const { value, typeId, description, date, status } = req.body;
  const { error, message } = await transactionService.createTransaction({
    value,
    typeId,
    description,
    date,
    status,
  });

  const returnMessage = {
    message: "Transação criada com sucesso!",
    transaction: message,
  };

  return res.status(200).json(returnMessage);
};

module.exports = {
  searchTrasctions,
  createTrasaction,
};
