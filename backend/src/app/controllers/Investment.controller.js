const investmentService = require("../services/Investment.service");

const validateMovementInput = (body, requireRequestId = false) => {
  const { type, amount, date, description, requestId } = body || {};
  const amountString = typeof amount === "number" ? String(amount) : amount;
  const validDate =
    typeof date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    !Number.isNaN(Date.parse(`${date}T00:00:00Z`)) &&
    new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date;

  if (!["contribution", "withdrawal"].includes(type)) {
    return { error: "Tipo de movimentação inválido." };
  }
  if (
    typeof amountString !== "string" ||
    !/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/.test(amountString) ||
    Number(amountString) <= 0
  ) {
    return { error: "Informe um valor maior que zero, com no máximo duas casas decimais." };
  }
  if (!validDate) return { error: "Informe uma data válida." };
  if (date > new Date().toISOString().slice(0, 10)) {
    return { error: "A data da movimentação não pode ser futura." };
  }
  if (description !== undefined && (typeof description !== "string" || description.length > 255)) {
    return { error: "A descrição deve ter no máximo 255 caracteres." };
  }
  if (
    requireRequestId &&
    (typeof requestId !== "string" ||
      requestId.length < 8 ||
      requestId.length > 64 ||
      !/^[A-Za-z0-9-]+$/.test(requestId))
  ) {
    return { error: "Identificador da solicitação inválido. Tente novamente." };
  }

  return {
    data: {
      type,
      amount: amountString,
      date,
      description: description?.trim() || null,
      ...(requireRequestId ? { requestId } : {}),
    },
  };
};

const parseMovementId = (value) =>
  /^\d+$/.test(String(value)) && Number(value) > 0 ? Number(value) : null;

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
  const validation = validateMovementInput(req.body, true);
  if (validation.error) {
    return res.status(400).json({ error: true, message: validation.error });
  }

  try {
    const result = await investmentService.createMovement(req.user.id, validation.data);
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

const updateMovement = async (req, res) => {
  const movementId = parseMovementId(req.params.id);
  if (!movementId) {
    return res.status(400).json({ error: true, message: "Identificador de movimentação inválido." });
  }
  const validation = validateMovementInput(req.body);
  if (validation.error) {
    return res.status(400).json({ error: true, message: validation.error });
  }

  try {
    const result = await investmentService.updateMovement(
      req.user.id,
      movementId,
      validation.data
    );
    if (result.error) {
      return res.status(result.status).json({ error: true, message: result.error });
    }
    const latest = await investmentService.listMovements(req.user.id);
    return res.status(200).json({
      error: false,
      data: latest.movements,
      balance: latest.balance,
    });
  } catch (error) {
    console.error("Erro ao atualizar movimentação de investimento:", error);
    return res.status(500).json({
      error: true,
      message: "Não foi possível atualizar a movimentação.",
    });
  }
};

const deleteMovement = async (req, res) => {
  const movementId = parseMovementId(req.params.id);
  if (!movementId) {
    return res.status(400).json({ error: true, message: "Identificador de movimentação inválido." });
  }

  try {
    const result = await investmentService.deleteMovement(req.user.id, movementId);
    if (result.error) {
      return res.status(result.status).json({ error: true, message: result.error });
    }
    const latest = await investmentService.listMovements(req.user.id);
    return res.status(200).json({
      error: false,
      data: latest.movements,
      balance: latest.balance,
    });
  } catch (error) {
    console.error("Erro ao excluir movimentação de investimento:", error);
    return res.status(500).json({
      error: true,
      message: "Não foi possível excluir a movimentação.",
    });
  }
};

const deleteMovements = async (req, res) => {
  const movementIds = req.body?.ids;
  if (
    !Array.isArray(movementIds) ||
    movementIds.length < 1 ||
    movementIds.length > 500 ||
    movementIds.some((id) => !Number.isSafeInteger(Number(id)) || Number(id) < 1) ||
    new Set(movementIds.map(Number)).size !== movementIds.length
  ) {
    return res.status(400).json({
      error: true,
      message: "Selecione de 1 a 500 movimentações válidas, sem repetição.",
    });
  }

  try {
    const result = await investmentService.deleteMovements(
      req.user.id,
      movementIds.map(Number)
    );
    if (result.error) {
      return res.status(result.status).json({ error: true, message: result.error });
    }
    const latest = await investmentService.listMovements(req.user.id);
    return res.status(200).json({
      error: false,
      deleted: result.deleted,
      data: latest.movements,
      balance: latest.balance,
    });
  } catch (error) {
    console.error("Erro ao excluir movimentações de investimento:", error);
    return res.status(500).json({
      error: true,
      message: "Não foi possível excluir as movimentações selecionadas.",
    });
  }
};

module.exports = {
  createMovement,
  deleteMovement,
  deleteMovements,
  listMovements,
  updateMovement,
};
