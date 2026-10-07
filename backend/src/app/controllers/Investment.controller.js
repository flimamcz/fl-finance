const investmentService = require("../services/Investment.service");

const listMovements = async (req, res) => {
  try {
    const result = await investmentService.listMovements(req.user.id);
    return res.status(200).json({
      error: false,
      data: result.movements,
      balance: result.balance,
    });
  } catch (error) {
    console.error("Erro ao listar movimentações de investimento:", error);
    return res.status(500).json({
      error: true,
      message: "Não foi possível carregar as movimentações de investimento.",
    });
  }
};

const createMovement = async (req, res) => {
  const { type, amount, date, description, requestId } = req.body || {};
  const amountString = typeof amount === "number" ? String(amount) : amount;
  const validDate =
    typeof date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    !Number.isNaN(Date.parse(`${date}T00:00:00Z`)) &&
    new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date;

  if (!["contribution", "withdrawal"].includes(type)) {
    return res.status(400).json({ error: true, message: "Tipo de movimentação inválido." });
  }
  if (
    typeof amountString !== "string" ||
    !/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/.test(amountString) ||
    Number(amountString) <= 0
  ) {
    return res.status(400).json({
      error: true,
      message: "Informe um valor maior que zero, com no máximo duas casas decimais.",
    });
  }
  if (!validDate) {
    return res.status(400).json({ error: true, message: "Informe uma data válida." });
  }
  if (
    typeof requestId !== "string" ||
    requestId.length < 8 ||
    requestId.length > 64 ||
    !/^[A-Za-z0-9-]+$/.test(requestId)
  ) {
    return res.status(400).json({
      error: true,
      message: "Identificador da solicitação inválido. Tente novamente.",
    });
  }
  if (date > new Date().toISOString().slice(0, 10)) {
    return res.status(400).json({
      error: true,
      message: "A data da movimentação não pode ser futura.",
    });
  }
  if (description !== undefined && (typeof description !== "string" || description.length > 255)) {
    return res.status(400).json({
      error: true,
      message: "A descrição deve ter no máximo 255 caracteres.",
    });
  }

  try {
    const result = await investmentService.createMovement(req.user.id, {
      type,
      amount: amountString,
      date,
      description: description?.trim() || null,
      requestId,
    });
    if (result.error) {
      return res.status(result.status).json({ error: true, message: result.error });
    }
    const latest = await investmentService.listMovements(req.user.id);
    return res.status(result.duplicate ? 200 : 201).json({
      error: false,
      data: latest.movements,
      balance: latest.balance,
    });
  } catch (error) {
    console.error("Erro ao registrar movimentação de investimento:", error);
    return res.status(500).json({
      error: true,
      message: "Não foi possível registrar a movimentação.",
    });
  }
};

module.exports = { createMovement, listMovements };
