const { Op } = require("sequelize");
const { Debt, DebtInstallment, Transaction, sequelize } = require("../../models");

const formatDate = (date) => date.toISOString().slice(0, 10);

const getInstallmentDate = (firstDate, offset) => {
  const [year, month, day] = firstDate.split("-").map(Number);
  const targetMonth = month - 1 + offset;
  const lastDay = new Date(Date.UTC(year, targetMonth + 1, 0)).getUTCDate();
  return formatDate(new Date(Date.UTC(year, targetMonth, Math.min(day, lastDay))));
};

const getToday = () => {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
};

const settleInstallment = async (installmentId, paymentDate = getToday()) => {
  return sequelize.transaction(async (transaction) => {
    const installment = await DebtInstallment.findOne({
      where: { id: installmentId, status: "pending" },
      include: [{ model: Debt, as: "debt" }],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!installment) return false;

    const expense = await Transaction.create(
      {
        value: installment.amount,
        typeId: 2,
        user_id: installment.debt.user_id,
        description: `Dívida: ${installment.debt.name} (${installment.installment_number}/${installment.debt.installment_count})`,
        date: paymentDate,
        status: true,
      },
      { transaction }
    );

    installment.status = "paid";
    installment.transaction_id = expense.id;
    installment.paid_at = new Date();
    await installment.save({ transaction });
    return true;
  });
};

const settleDueInstallments = async (userId = null) => {
  const where = {
    status: "pending",
    due_date: { [Op.lte]: getToday() },
  };
  const include = [{ model: Debt, as: "debt", required: true }];

  if (userId) {
    include[0].where = { user_id: Number(userId) };
  }

  const dueInstallments = await DebtInstallment.findAll({
    where,
    include,
    attributes: ["id"],
    order: [["due_date", "ASC"]],
  });

  for (const installment of dueInstallments) {
    await settleInstallment(installment.id, installment.due_date);
  }
};

const listDebts = async (userId) => {
  await settleDueInstallments(userId);
  return Debt.findAll({
    where: { user_id: Number(userId) },
    include: [{ model: DebtInstallment, as: "installments" }],
    order: [[{ model: DebtInstallment, as: "installments" }, "due_date", "ASC"]],
  });
};

const createDebt = async (userId, input) => {
  const amount = Number(input.amount);
  const count = input.recurring ? Number(input.installmentCount) : 1;
  const firstDueDate = input.firstDueDate;

  if (!input.name || input.name.trim().length > 120) {
    return { error: "Informe um nome para a dívida com até 120 caracteres.", status: 400 };
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "O valor deve ser maior que zero e ter no máximo duas casas decimais.", status: 400 };
  }
  const parsedDueDate = new Date(`${firstDueDate}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(firstDueDate || "") ||
    Number.isNaN(parsedDueDate.getTime()) ||
    formatDate(parsedDueDate) !== firstDueDate
  ) {
    return { error: "Informe uma data de vencimento válida.", status: 400 };
  }
  if (Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-7) {
    return { error: "O valor deve ter no máximo duas casas decimais.", status: 400 };
  }
  if (input.recurring && (!Number.isInteger(count) || count < 2 || count > 120)) {
    return { error: "A recorrência deve ter entre 2 e 120 parcelas.", status: 400 };
  }
  if (input.creditor && input.creditor.trim().length > 120) {
    return { error: "O nome da pessoa/credor deve ter até 120 caracteres.", status: 400 };
  }

  const debt = await sequelize.transaction(async (transaction) => {
    const createdDebt = await Debt.create(
      {
        user_id: Number(userId),
        name: input.name.trim(),
        creditor: input.creditor?.trim() || null,
        amount: amount.toFixed(2),
        first_due_date: firstDueDate,
        recurring: Boolean(input.recurring),
        installment_count: count,
      },
      { transaction }
    );

    const installments = Array.from({ length: count }, (_, index) => ({
      debt_id: createdDebt.id,
      installment_number: index + 1,
      due_date: getInstallmentDate(firstDueDate, index),
      amount: amount.toFixed(2),
      status: "pending",
    }));

    await DebtInstallment.bulkCreate(installments, { transaction });
    return createdDebt;
  });

  await settleDueInstallments(userId);
  return { data: debt };
};

const payInstallment = async (userId, installmentId) => {
  const installment = await DebtInstallment.findOne({
    where: { id: installmentId },
    include: [{ model: Debt, as: "debt", where: { user_id: Number(userId) } }],
  });

  if (!installment) return { error: "Parcela não encontrada.", status: 404 };
  if (installment.status === "paid") return { error: "Esta parcela já foi paga.", status: 409 };

  await settleInstallment(installment.id);
  return { data: true };
};

const deleteDebt = async (userId, debtId) => {
  const debt = await Debt.findOne({
    where: { id: debtId, user_id: Number(userId) },
    include: [{ model: DebtInstallment, as: "installments" }],
  });

  if (!debt) return { error: "Dívida não encontrada.", status: 404 };
  if (debt.installments.some((installment) => installment.status === "paid")) {
    return { error: "Não é possível excluir uma dívida com parcelas já lançadas no histórico.", status: 409 };
  }

  await debt.destroy();
  return { data: true };
};

module.exports = {
  createDebt,
  deleteDebt,
  listDebts,
  payInstallment,
  settleDueInstallments,
};