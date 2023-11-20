const transactionService = require("../services/Transaction.service");

const searchTrasctions = async (req, res) => {
  const { error, message } = await transactionService.searchTransactions();

  if (error) {
    return res.status(404).json(message);
  }

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

  if (error) {
    return res.status(400).json(message);
  }

  const returnMessage = {
    message: "Transação criada com sucesso!",
    operation: message,
  };

  return res.status(201).json(returnMessage);
};

const updateTransaction = async (req, res) => {
  const { error, message } = await transactionService.updateTransaction(
    req.body
  );
  if (error) return res.status(400).json(message);

  return res.status(200).json({ transaction: message });
};

const deleteTransaction = async (req, res) => {
  const { error, message } = await transactionService.deleteTransaction(
    req.params.id
  );

  if (!error) {
    return res.status(400).json(message);
  }

  return res.status(200).json(message);
};

module.exports = {
  searchTrasctions,
  createTrasaction,
  deleteTransaction,
  updateTransaction,
};
