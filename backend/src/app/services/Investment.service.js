const { InvestmentMovement, Transaction, User, sequelize } = require("../../models");

const amountToCents = (amount) => Math.round(Number(amount) * 100);
const toTransactionDescription = (type, description) =>
  `${type === "contribution" ? "Aporte" : "Resgate"} em investimentos${description ? `: ${description}` : ""}`.slice(0, 255);

const validateMovementSequence = (movements) => {
  let balanceCents = 0;
  const orderedMovements = [...movements].sort((a, b) => {
    const dateOrder = String(a.date).localeCompare(String(b.date));
    return dateOrder || Number(a.id) - Number(b.id);
  });

  for (const movement of orderedMovements) {
    const amountCents = amountToCents(movement.amount);
    balanceCents += movement.type === "contribution" ? amountCents : -amountCents;
    if (balanceCents < 0) {
      return {
        error: "Esta alteração deixaria o saldo investido negativo em uma movimentação posterior.",
        status: 409,
      };
    }
  }

  return null;
};

const listMovements = async (userId) => {
  const movements = await InvestmentMovement.findAll({
    where: { user_id: userId },
    order: [["date", "DESC"], ["id", "DESC"]],
  });
  const balanceCents = movements.reduce((balance, movement) => {
    const cents = amountToCents(movement.amount);
    return balance + (movement.type === "contribution" ? cents : -cents);
  }, 0);

  return {
    movements,
    balance: (balanceCents / 100).toFixed(2),
  };
};

const createMovement = async (userId, movementData) => {
  return sequelize.transaction(async (transaction) => {
    // Serialize movement creation per user so concurrent withdrawals cannot
    // both spend the same available balance.
    const user = await User.findByPk(userId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!user) return { error: "Usuário não encontrado.", status: 404 };

    const duplicate = await InvestmentMovement.findOne({
      where: { user_id: userId, request_id: movementData.requestId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (duplicate) {
      const sameRequest =
        duplicate.type === movementData.type &&
        amountToCents(duplicate.amount) === amountToCents(movementData.amount) &&
        duplicate.date === movementData.date &&
        (duplicate.description || null) === (movementData.description || null);
      if (!sameRequest) {
        return { error: "Este identificador já foi usado para outra movimentação.", status: 409 };
      }
      return { movement: duplicate, duplicate: true };
    }

    const existingMovements = await InvestmentMovement.findAll({
      where: { user_id: userId },
      attributes: ["type", "amount", "date", "id"],
      order: [["date", "ASC"], ["id", "ASC"]],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    const amountCents = amountToCents(movementData.amount);
    const movementDelta = movementData.type === "contribution" ? amountCents : -amountCents;
    let runningBalanceCents = 0;
    let inserted = false;

    const applyNewMovement = () => {
      if (movementData.type === "withdrawal" && amountCents > runningBalanceCents) {
        return {
          error: "O saque não pode ser maior que o saldo investido disponível nesta data.",
          status: 409,
        };
      }
      runningBalanceCents += movementDelta;
      inserted = true;
      return null;
    };

    for (const existingMovement of existingMovements) {
      // New entries follow existing entries on the same date (newest ID).
      if (!inserted && existingMovement.date > movementData.date) {
        const result = applyNewMovement();
        if (result) return result;
      }

      const existingAmountCents = amountToCents(existingMovement.amount);
      runningBalanceCents +=
        existingMovement.type === "contribution" ? existingAmountCents : -existingAmountCents;
      if (runningBalanceCents < 0) {
        return {
          error: "Esta data deixaria o saldo investido negativo em uma movimentação posterior.",
          status: 409,
        };
      }
    }

    if (!inserted) {
      const result = applyNewMovement();
      if (result) return result;
    }

    const isContribution = movementData.type === "contribution";
    const ledgerTransaction = await Transaction.create(
      {
        value: movementData.amount,
        typeId: isContribution ? 3 : 1,
        user_id: userId,
        description: toTransactionDescription(movementData.type, movementData.description),
        date: movementData.date,
        status: true,
        isSalary: false,
      },
      { transaction }
    );
    const movement = await InvestmentMovement.create(
      {
        user_id: userId,
        transaction_id: ledgerTransaction.id,
        request_id: movementData.requestId,
        type: movementData.type,
        amount: movementData.amount,
        date: movementData.date,
        description: movementData.description,
      },
      { transaction }
    );
    return { movement, duplicate: false };
  });
};

const updateMovement = async (userId, movementId, movementData) => {
  return sequelize.transaction(async (transaction) => {
    const user = await User.findByPk(userId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!user) return { error: "Usuário não encontrado.", status: 404 };

    const movement = await InvestmentMovement.findOne({
      where: { id: movementId, user_id: userId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!movement) return { error: "Movimentação não encontrada.", status: 404 };

    const transactionRecord = await Transaction.findOne({
      where: { id: movement.transaction_id, user_id: userId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!transactionRecord) {
      return {
        error: "A transação vinculada não foi encontrada; a movimentação não foi alterada.",
        status: 409,
      };
    }

    const allMovements = await InvestmentMovement.findAll({
      where: { user_id: userId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    const updatedMovements = allMovements.map((entry) =>
      Number(entry.id) === Number(movementId)
        ? { ...entry.toJSON(), ...movementData }
        : entry.toJSON()
    );
    const invalidSequence = validateMovementSequence(updatedMovements);
    if (invalidSequence) return invalidSequence;

    const isContribution = movementData.type === "contribution";
    await movement.update(movementData, { transaction });
    await transactionRecord.update(
      {
        value: movementData.amount,
        typeId: isContribution ? 3 : 1,
        description: toTransactionDescription(movementData.type, movementData.description),
        date: movementData.date,
        status: true,
        isSalary: false,
      },
      { transaction }
    );
    return { movement };
  });
};

const deleteMovement = async (userId, movementId) => {
  return sequelize.transaction(async (transaction) => {
    const user = await User.findByPk(userId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!user) return { error: "Usuário não encontrado.", status: 404 };

    const movement = await InvestmentMovement.findOne({
      where: { id: movementId, user_id: userId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!movement) return { error: "Movimentação não encontrada.", status: 404 };

    const transactionRecord = await Transaction.findOne({
      where: { id: movement.transaction_id, user_id: userId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!transactionRecord) {
      return {
        error: "A transação vinculada não foi encontrada; a movimentação não foi excluída.",
        status: 409,
      };
    }

    const remainingMovements = await InvestmentMovement.findAll({
      where: { user_id: userId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    const invalidSequence = validateMovementSequence(
      remainingMovements
        .filter((entry) => Number(entry.id) !== Number(movementId))
        .map((entry) => entry.toJSON())
    );
    if (invalidSequence) {
      return {
        error: "Não é possível excluir este aporte porque há saques posteriores que dependem dele. Edite ou exclua primeiro esses saques.",
        status: 409,
      };
    }

    await movement.destroy({ transaction });
    await transactionRecord.destroy({ transaction });
    return { deleted: true };
  });
};

const deleteMovements = async (userId, movementIds) => {
  return sequelize.transaction(async (transaction) => {
    const user = await User.findByPk(userId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!user) return { error: "Usuário não encontrado.", status: 404 };

    const movements = await InvestmentMovement.findAll({
      where: { id: movementIds, user_id: userId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (movements.length !== movementIds.length) {
      return {
        error: "Uma ou mais movimentações selecionadas não foram encontradas.",
        status: 404,
      };
    }

    const allMovements = await InvestmentMovement.findAll({
      where: { user_id: userId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    const selectedIds = new Set(movementIds.map(Number));
    const remainingMovements = allMovements
      .filter((movement) => !selectedIds.has(Number(movement.id)))
      .map((movement) => movement.toJSON());
    const invalidSequence = validateMovementSequence(remainingMovements);
    if (invalidSequence) {
      return {
        error: "Não é possível excluir essa seleção: saques posteriores dependem de um ou mais aportes selecionados. Ajuste também esses saques ou altere a seleção.",
        status: 409,
      };
    }

    const transactionIds = movements.map((movement) => movement.transaction_id);
    const linkedTransactions = await Transaction.findAll({
      where: { id: transactionIds, user_id: userId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (linkedTransactions.length !== movements.length) {
      return {
        error: "Uma ou mais transações vinculadas não foram encontradas; nada foi excluído.",
        status: 409,
      };
    }

    await InvestmentMovement.destroy({
      where: { id: movementIds, user_id: userId },
      transaction,
    });
    await Transaction.destroy({
      where: { id: transactionIds, user_id: userId },
      transaction,
    });
    return { deleted: movements.length };
  });
};

module.exports = {
  createMovement,
  deleteMovement,
  deleteMovements,
  listMovements,
  updateMovement,
};
