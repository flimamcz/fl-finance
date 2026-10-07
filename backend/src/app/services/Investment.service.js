const { InvestmentMovement, Transaction, User, sequelize } = require("../../models");

const amountToCents = (amount) => Math.round(Number(amount) * 100);

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
        typeId: isContribution ? 2 : 1,
        user_id: userId,
        description: `${isContribution ? "Aporte" : "Resgate"} em investimentos${movementData.description ? `: ${movementData.description}` : ""}`.slice(0, 255),
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

module.exports = { createMovement, listMovements };
