const debtService = require("../services/Debt.service");

const sendServiceResult = (res, result, successStatus = 200) => {
  if (result.error) {
    return res.status(result.status || 400).json({ error: true, message: result.error });
  }
  return res.status(successStatus).json({ error: false, data: result.data });
};

const listDebts = async (req, res) => {
  try {
    const data = await debtService.listDebts(req.user.id);
    return res.status(200).json({ error: false, data });
  } catch (error) {
    console.error("Erro ao listar dívidas:", error);
    return res.status(500).json({ error: true, message: "Não foi possível listar as dívidas." });
  }
};

const createDebt = async (req, res) => {
  try {
    const result = await debtService.createDebt(req.user.id, req.body);
    if (result.error) return sendServiceResult(res, result);
    const data = await debtService.listDebts(req.user.id);
    return res.status(201).json({ error: false, data });
  } catch (error) {
    console.error("Erro ao criar dívida:", error);
    return res.status(500).json({ error: true, message: "Não foi possível criar a dívida." });
  }
};

const payInstallment = async (req, res) => {
  try {
    const result = await debtService.payInstallment(req.user.id, req.params.installmentId);
    if (result.error) return sendServiceResult(res, result);
    const data = await debtService.listDebts(req.user.id);
    return res.status(200).json({ error: false, data });
  } catch (error) {
    console.error("Erro ao quitar parcela:", error);
    return res.status(500).json({ error: true, message: "Não foi possível quitar a parcela." });
  }
};

const deleteDebt = async (req, res) => {
  try {
    const result = await debtService.deleteDebt(req.user.id, req.params.id);
    return sendServiceResult(res, result);
  } catch (error) {
    console.error("Erro ao excluir dívida:", error);
    return res.status(500).json({ error: true, message: "Não foi possível excluir a dívida." });
  }
};

module.exports = { createDebt, deleteDebt, listDebts, payInstallment };