const crypto = require("crypto");
const {
  Category,
  Debt,
  DebtInstallment,
  InvestmentMovement,
  Transaction,
  sequelize,
} = require("../../models");

class BackupValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "BackupValidationError";
  }
}

const normalizeText = (value) => String(value ?? "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase("pt-BR")
  .replace(/[^a-z0-9]/g, "");

const amountInCents = (value) => Math.round(Number(value) * 100);
const isValidDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value ?? ""))) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const transactionKey = (transaction) => [
  transaction.date,
  amountInCents(transaction.value),
  Number(transaction.typeId),
  normalizeText(transaction.description),
].join("|");

const debtKey = (debt) => [
  normalizeText(debt.name),
  normalizeText(debt.creditor),
  amountInCents(debt.amount),
  debt.first_due_date,
  Number(debt.installment_count),
  Boolean(debt.recurring),
].join("|");

const assertUniqueIds = (records, group) => {
  const ids = new Set();
  for (const record of records) {
    const id = String(record.sourceId ?? "").trim();
    if (!id || ids.has(id)) {
      throw new BackupValidationError(`O backup contém ID ausente ou repetido no grupo ${group}.`);
    }
    ids.add(id);
  }
};

const validateBackup = (backup) => {
  const groups = ["transactions", "debts", "installments", "investments", "categories"];
  if (!backup || groups.some((group) => !Array.isArray(backup[group]))) {
    throw new BackupValidationError("O arquivo não contém todos os grupos esperados do backup.");
  }
  const total = groups.reduce((count, group) => count + backup[group].length, 0);
  if (total === 0 || total > 5000) {
    throw new BackupValidationError("O backup precisa conter de 1 a 5.000 registros.");
  }
  for (const group of groups) assertUniqueIds(backup[group], group);

  backup.transactions.forEach((row, index) => {
    if (!isValidDate(row.date) || !String(row.description ?? "").trim()
      || !Number.isFinite(Number(row.value)) || Number(row.value) <= 0
      || ![1, 2, 3].includes(Number(row.typeId))
      || typeof row.status !== "boolean" || typeof row.isSalary !== "boolean") {
      throw new BackupValidationError(`Transação ${index + 1} inválida no backup.`);
    }
  });
  backup.debts.forEach((row, index) => {
    if (!String(row.name ?? "").trim() || !isValidDate(row.firstDueDate)
      || !Number.isFinite(Number(row.amount)) || Number(row.amount) <= 0
      || !Number.isInteger(Number(row.installmentCount)) || Number(row.installmentCount) < 1
      || Number(row.installmentCount) > 120) {
      throw new BackupValidationError(`Dívida ${index + 1} inválida no backup.`);
    }
  });
  backup.installments.forEach((row, index) => {
    if (!isValidDate(row.dueDate) || !Number.isInteger(Number(row.installmentNumber))
      || Number(row.installmentNumber) < 1 || !Number.isFinite(Number(row.amount))
      || Number(row.amount) <= 0 || !["paid", "pending"].includes(row.status)
      || (row.paidAt && Number.isNaN(new Date(row.paidAt).getTime()))) {
      throw new BackupValidationError(`Parcela ${index + 1} inválida no backup.`);
    }
  });
  backup.investments.forEach((row, index) => {
    if (!isValidDate(row.date) || !Number.isFinite(Number(row.amount)) || Number(row.amount) <= 0
      || !["contribution", "withdrawal"].includes(row.type)) {
      throw new BackupValidationError(`Movimentação de investimento ${index + 1} inválida no backup.`);
    }
  });
  backup.categories.forEach((row, index) => {
    if (!String(row.name ?? "").trim() || ![1, 2, 3].includes(Number(row.typeId))) {
      throw new BackupValidationError(`Categoria ${index + 1} inválida no backup.`);
    }
  });
};

const getRequestId = (sourceId) => {
  const id = `backup-${String(sourceId)}`;
  return id.length <= 64 ? id : `backup-${crypto.createHash("sha256").update(id).digest("hex").slice(0, 56)}`;
};

const importBackup = async (userId, backup) => {
  validateBackup(backup);
  const result = {
    transactions: 0,
    debts: 0,
    installments: 0,
    investments: 0,
    categories: 0,
  };

  await sequelize.transaction(async (databaseTransaction) => {
    const categoryRows = await Category.findAll({ transaction: databaseTransaction, lock: databaseTransaction.LOCK.UPDATE });
    const categoriesByKey = new Map(categoryRows.map((category) => [
      `${Number(category.type_id)}|${normalizeText(category.name)}`,
      category,
    ]));
    const ensureCategory = async ({ name, typeId, icon, color }) => {
      const key = `${Number(typeId)}|${normalizeText(name)}`;
      let category = categoriesByKey.get(key);
      if (!category) {
        category = await Category.create({
          name: String(name).trim(),
          type_id: Number(typeId),
          icon: icon || "📄",
          color: color || "#94a3b8",
        }, { transaction: databaseTransaction });
        categoriesByKey.set(key, category);
        result.categories += 1;
      } else if (icon || color) {
        await category.update({
          icon: icon || category.icon,
          color: color || category.color,
        }, { transaction: databaseTransaction });
      }
      return category;
    };

    for (const category of backup.categories) {
      await ensureCategory(category);
    }

    const existingDebts = await Debt.findAll({
      where: { user_id: Number(userId) },
      include: [{ model: DebtInstallment, as: "installments" }],
      transaction: databaseTransaction,
      lock: databaseTransaction.LOCK.UPDATE,
    });
    const debtsByKey = new Map(existingDebts.map((debt) => [debtKey(debt), debt]));
    const debtsBySourceId = new Map();
    for (const importedDebt of backup.debts) {
      const candidate = {
        name: importedDebt.name,
        creditor: importedDebt.creditor,
        amount: importedDebt.amount,
        first_due_date: importedDebt.firstDueDate,
        installment_count: importedDebt.installmentCount,
        recurring: importedDebt.recurring,
      };
      let debt = debtsByKey.get(debtKey(candidate));
      if (!debt) {
        debt = await Debt.create({
          user_id: Number(userId),
          name: String(importedDebt.name).trim(),
          creditor: String(importedDebt.creditor ?? "").trim() || null,
          amount: Number(importedDebt.amount).toFixed(2),
          first_due_date: importedDebt.firstDueDate,
          recurring: Boolean(importedDebt.recurring),
          installment_count: Number(importedDebt.installmentCount),
        }, { transaction: databaseTransaction });
        debt.installments = [];
        debtsByKey.set(debtKey(candidate), debt);
        result.debts += 1;
      }
      debtsBySourceId.set(String(importedDebt.sourceId), debt);
    }

    const existingTransactions = await Transaction.findAll({
      where: { user_id: Number(userId) },
      transaction: databaseTransaction,
      lock: databaseTransaction.LOCK.UPDATE,
    });
    const existingTransactionsByKey = new Map();
    existingTransactions.forEach((transaction) => {
      const key = transactionKey(transaction);
      if (!existingTransactionsByKey.has(key)) existingTransactionsByKey.set(key, []);
      existingTransactionsByKey.get(key).push(transaction);
    });
    const transactionsBySourceId = new Map();
    for (const importedTransaction of backup.transactions) {
      let categoryId = null;
      const categoryName = String(importedTransaction.category ?? "").trim();
      if (categoryName) {
        const categoryType = Number(importedTransaction.typeId) === 3 ? 3 : Number(importedTransaction.typeId);
        const category = await ensureCategory({ name: categoryName, typeId: categoryType });
        categoryId = category.id;
      }

      const key = transactionKey(importedTransaction);
      const existing = existingTransactionsByKey.get(key);
      let transaction = existing?.shift();
      if (transaction) {
        await transaction.update({
          category_id: categoryId,
          isSalary: Number(importedTransaction.typeId) === 1 && importedTransaction.isSalary,
          status: importedTransaction.status,
        }, { transaction: databaseTransaction });
      } else {
        transaction = await Transaction.create({
          user_id: Number(userId),
          value: String(importedTransaction.value),
          typeId: Number(importedTransaction.typeId),
          category_id: categoryId,
          description: String(importedTransaction.description).trim(),
          date: importedTransaction.date,
          status: importedTransaction.status,
          isSalary: Number(importedTransaction.typeId) === 1 && importedTransaction.isSalary,
        }, { transaction: databaseTransaction });
        result.transactions += 1;
      }
      transactionsBySourceId.set(String(importedTransaction.sourceId), transaction);
    }

    for (const importedInstallment of backup.installments) {
      const debt = debtsBySourceId.get(String(importedInstallment.debtSourceId));
      if (!debt) {
        throw new BackupValidationError(`A parcela ${importedInstallment.sourceId} não referencia uma dívida do backup.`);
      }

      let installment = (debt.installments || []).find(
        (candidate) => Number(candidate.installment_number) === Number(importedInstallment.installmentNumber),
      );
      if (!installment) {
        installment = await DebtInstallment.create({
          debt_id: debt.id,
          installment_number: Number(importedInstallment.installmentNumber),
          due_date: importedInstallment.dueDate,
          amount: Number(importedInstallment.amount).toFixed(2),
          status: importedInstallment.status,
          auto_settle: Boolean(importedInstallment.autoSettle),
          paid_at: importedInstallment.paidAt || null,
        }, { transaction: databaseTransaction });
        debt.installments = [...(debt.installments || []), installment];
        result.installments += 1;
      }

      const linkedTransaction = importedInstallment.transactionSourceId == null
        ? null
        : transactionsBySourceId.get(String(importedInstallment.transactionSourceId));
      let status = importedInstallment.status;
      let transactionId = linkedTransaction?.id || installment.transaction_id || null;
      if (status === "paid" && !transactionId) {
        const paymentDate = importedInstallment.paidAt && isValidDate(String(importedInstallment.paidAt).slice(0, 10))
          ? String(importedInstallment.paidAt).slice(0, 10)
          : importedInstallment.dueDate;
        const payment = await Transaction.create({
          user_id: Number(userId),
          value: String(importedInstallment.amount),
          typeId: 2,
          category_id: null,
          description: `Dívida: ${debt.name} (${importedInstallment.installmentNumber}/${debt.installment_count})`.slice(0, 255),
          date: paymentDate,
          status: true,
          isSalary: false,
        }, { transaction: databaseTransaction });
        transactionId = payment.id;
        result.transactions += 1;
      }
      if (transactionId) status = "paid";

      await installment.update({
        due_date: importedInstallment.dueDate,
        amount: Number(importedInstallment.amount).toFixed(2),
        status,
        auto_settle: status === "paid" || Boolean(importedInstallment.autoSettle),
        transaction_id: transactionId,
        paid_at: status === "paid"
          ? importedInstallment.paidAt || installment.paid_at || importedInstallment.dueDate
          : null,
      }, { transaction: databaseTransaction });
    }

    for (const movement of backup.investments) {
      let linkedTransaction = movement.transactionSourceId == null
        ? null
        : transactionsBySourceId.get(String(movement.transactionSourceId));
      const requestId = getRequestId(movement.sourceId);
      const existingMovement = await InvestmentMovement.findOne({
        where: { user_id: Number(userId), request_id: requestId },
        transaction: databaseTransaction,
        lock: databaseTransaction.LOCK.UPDATE,
      });

      if (existingMovement) {
        const sameMovement = existingMovement.type === movement.type
          && amountInCents(existingMovement.amount) === amountInCents(movement.amount)
          && existingMovement.date === movement.date
          && (existingMovement.description || "") === (movement.description || "");
        if (!sameMovement) {
          throw new BackupValidationError(`O ID de movimentação ${movement.sourceId} já pertence a outro registro.`);
        }
        const existingTransaction = linkedTransaction
          || await Transaction.findOne({
            where: { id: existingMovement.transaction_id, user_id: Number(userId) },
            transaction: databaseTransaction,
            lock: databaseTransaction.LOCK.UPDATE,
          });
        if (existingTransaction && existingMovement.transaction_id !== existingTransaction.id) {
          await existingMovement.update({ transaction_id: existingTransaction.id }, { transaction: databaseTransaction });
        }
        continue;
      }

      const existingLinkedMovement = linkedTransaction
        ? await InvestmentMovement.findOne({
          where: { user_id: Number(userId), transaction_id: linkedTransaction.id },
          transaction: databaseTransaction,
          lock: databaseTransaction.LOCK.UPDATE,
        })
        : null;
      if (existingLinkedMovement) {
        const sameMovement = existingLinkedMovement.type === movement.type
          && amountInCents(existingLinkedMovement.amount) === amountInCents(movement.amount)
          && existingLinkedMovement.date === movement.date
          && (existingLinkedMovement.description || "") === (movement.description || "");
        if (!sameMovement) {
          throw new BackupValidationError(`A transação da movimentação ${movement.sourceId} já está ligada a outro registro.`);
        }
        await existingLinkedMovement.update({ request_id: requestId }, { transaction: databaseTransaction });
        continue;
      }

      if (!linkedTransaction) {
        const description = `${movement.type === "contribution" ? "Aporte" : "Resgate"} em investimentos${movement.description ? `: ${movement.description}` : ""}`.slice(0, 255);
        linkedTransaction = await Transaction.create({
          user_id: Number(userId),
          value: String(movement.amount),
          typeId: movement.type === "contribution" ? 3 : 1,
          category_id: null,
          description,
          date: movement.date,
          status: true,
          isSalary: false,
        }, { transaction: databaseTransaction });
        result.transactions += 1;
      }

      await InvestmentMovement.create({
        user_id: Number(userId),
        transaction_id: linkedTransaction.id,
        request_id: requestId,
        type: movement.type,
        amount: Number(movement.amount).toFixed(2),
        date: movement.date,
        description: String(movement.description ?? "").trim() || null,
      }, { transaction: databaseTransaction });
      result.investments += 1;
    }
  });

  return result;
};

module.exports = { BackupValidationError, importBackup };
