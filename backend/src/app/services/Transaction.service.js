// src/app/services/Transaction.service.js - VERSÃO COM CATEGORIAS
const { Op } = require("sequelize");
const { Transaction, Category, Debt, DebtInstallment, InvestmentMovement } = require("../../models");
const debtService = require("./Debt.service");

const normalizeDebtText = (value) => String(value ?? "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase("pt-BR")
  .replace(/[^a-z0-9]/g, "");

const getAmountInCents = (value) => Math.round(Number(value) * 100);

const findMatchingDebtInstallment = (transaction, debts) => {
  if (Number(transaction.typeId) !== 2) return null;

  const description = normalizeDebtText(transaction.description);
  const amountInCents = getAmountInCents(transaction.value);
  const installmentNumberMatch = String(transaction.description ?? "").match(/\((\d+)\s*\/\s*(\d+)\)/);
  const statedInstallmentNumber = installmentNumberMatch
    ? Number(installmentNumberMatch[1])
    : null;
  const statedInstallmentCount = installmentNumberMatch
    ? Number(installmentNumberMatch[2])
    : null;

  const matches = [];
  for (const debt of debts) {
    const debtName = normalizeDebtText(debt.name);
    const creditor = normalizeDebtText(debt.creditor);
    const descriptionMatchesDebt =
      (debtName.length >= 4 && description.includes(debtName))
      || (creditor.length >= 4 && description.includes(creditor));
    if (!descriptionMatchesDebt) continue;

    for (const installment of debt.installments || []) {
      if (getAmountInCents(installment.amount) !== amountInCents) continue;
      if (statedInstallmentNumber !== null) {
        if (
          Number(installment.installment_number) !== statedInstallmentNumber
          || Number(debt.installment_count) !== statedInstallmentCount
        ) continue;
      } else if (String(installment.due_date).slice(0, 10) !== String(transaction.date).slice(0, 10)) {
        continue;
      }

      matches.push(installment);
    }
  }

  return matches.length === 1 ? matches[0] : null;
};

const searchTransactions = async (userId = null) => {
  const whereClause = {};
  
  if (userId) {
    whereClause.user_id = Number(userId);
  }
  
  try {
    // Auto-settlements create the expense entries consumed by every balance view.
    // Run them before reading the ledger so dashboard/account responses are current
    // even when the user has not opened the debts page.
    await debtService.settleDueInstallments(userId);

    const transactions = await Transaction.findAll({
      where: whereClause,
      order: [['date', 'DESC']],
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'icon', 'color']
        }
      ]
    });

    const linkedInstallments = transactions.length > 0
      ? await DebtInstallment.findAll({
        where: { transaction_id: { [Op.in]: transactions.map(({ id }) => id) } },
        attributes: ["id", "transaction_id", "installment_number"],
        include: [{ model: Debt, as: "debt", attributes: ["id", "name", "installment_count"] }],
      })
      : [];
    const linkedInvestmentMovements = transactions.length > 0
      ? await InvestmentMovement.findAll({
        where: { transaction_id: { [Op.in]: transactions.map(({ id }) => id) } },
        attributes: ["id", "transaction_id", "type", "amount", "date", "description"],
      })
      : [];
    const linkedInstallmentsByTransaction = new Map(
      linkedInstallments.map((installment) => [installment.transaction_id, installment])
    );
    const linkedInvestmentMovementsByTransaction = new Map(
      linkedInvestmentMovements.map((movement) => [movement.transaction_id, movement])
    );
    const transactionsWithDebtInstallments = transactions.map((transaction) => {
      const linkedInstallment = linkedInstallmentsByTransaction.get(transaction.id);
      const linkedInvestmentMovement = linkedInvestmentMovementsByTransaction.get(transaction.id);
      return {
        ...transaction.toJSON(),
        debtInstallment: linkedInstallment
          ? {
            id: linkedInstallment.id,
            debt_id: linkedInstallment.debt.id,
            installment_number: linkedInstallment.installment_number,
            installment_count: linkedInstallment.debt.installment_count,
            debt_name: linkedInstallment.debt.name,
          }
          : null,
        investmentMovement: linkedInvestmentMovement
          ? {
            id: linkedInvestmentMovement.id,
            type: linkedInvestmentMovement.type,
            amount: linkedInvestmentMovement.amount,
            date: linkedInvestmentMovement.date,
            description: linkedInvestmentMovement.description,
          }
          : null,
      };
    });

    return { error: null, message: transactionsWithDebtInstallments };
    
  } catch (error) {
    console.error("Transaction query failed:", error.name);
    return { error: "DATABASE_ERROR", message: "Erro ao buscar transações" };
  }
};

const createTransaction = async (dataTransaction) => {
  try {
    // ✅ CORREÇÃO: Converte userId para user_id se necessário
    const dataToSave = { ...dataTransaction };
    
    // Se vier com userId (camelCase), converte para user_id (snake_case)
    if (dataToSave.userId !== undefined) {
      dataToSave.user_id = dataToSave.userId;
      delete dataToSave.userId;
    }
    
    // ✅ NOVO: Trata categoryId
    if (dataToSave.categoryId !== undefined) {
      dataToSave.category_id = dataToSave.categoryId;
      delete dataToSave.categoryId;
    }
    
    // Se não tiver category_id, usa null (mantém compatibilidade)
    if (!dataToSave.category_id) {
      dataToSave.category_id = null;
    }
    
    const newTransaction = await Transaction.create(dataToSave);
    
    // Busca transação com dados da categoria
    const transactionWithCategory = await Transaction.findByPk(newTransaction.id, {
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'icon', 'color']
        }
      ]
    });
    
    return { error: null, message: transactionWithCategory };
  } catch (error) {
    console.error("Transaction creation failed:", error.name);
    return { error: "Bad Request", message: "Erro ao criar transação!" };
  }
};

const createTransactionsBatch = async (userId, transactions) => {
  try {
    let importedCount = 0;
    let skippedDebtInstallments = 0;
    let linkedDebtInstallments = 0;

    await Transaction.sequelize.transaction(async (databaseTransaction) => {
      const debts = await Debt.findAll({
        where: { user_id: Number(userId) },
        include: [{ model: DebtInstallment, as: "installments" }],
        transaction: databaseTransaction,
        lock: databaseTransaction.LOCK.UPDATE,
      });
      const rowsToCreate = [];
      const installmentsToLink = [];
      const reservedInstallments = new Set();

      transactions.forEach((transaction) => {
        const installment = findMatchingDebtInstallment(transaction, debts);
        if (!installment) {
          rowsToCreate.push(transaction);
          return;
        }

        if (reservedInstallments.has(installment.id) || installment.transaction_id) {
          skippedDebtInstallments += 1;
          return;
        }

        if (!transaction.status) {
          skippedDebtInstallments += 1;
          return;
        }

        reservedInstallments.add(installment.id);
        installmentsToLink.push({
          installment,
          transactionIndex: rowsToCreate.length,
        });
        rowsToCreate.push(transaction);
      });

      const createdTransactions = await Transaction.bulkCreate(
        rowsToCreate.map((transaction) => ({
          value: String(transaction.value),
          typeId: transaction.typeId,
          category_id: null,
          description: transaction.description.trim(),
          date: transaction.date,
          status: transaction.status,
          isSalary: transaction.typeId === 1 && transaction.isSalary,
          user_id: userId,
        })),
        { transaction: databaseTransaction, validate: true },
      );

      for (const { installment, transactionIndex } of installmentsToLink) {
        const createdTransaction = createdTransactions[transactionIndex];
        if (!createdTransaction?.id) {
          throw new Error("Não foi possível vincular o pagamento importado à parcela correspondente.");
        }

        const [updatedInstallments] = await DebtInstallment.update(
          {
            status: "paid",
            transaction_id: createdTransaction.id,
            paid_at: new Date(),
            auto_settle: true,
          },
          {
            where: { id: installment.id, transaction_id: null },
            transaction: databaseTransaction,
          },
        );
        if (updatedInstallments !== 1) {
          throw new Error("A parcela mudou durante a importação; nenhum lançamento foi importado.");
        }
        linkedDebtInstallments += 1;
      }

      importedCount = rowsToCreate.length;
    });

    return {
      error: null,
      count: importedCount,
      skippedDebtInstallments,
      linkedDebtInstallments,
    };
  } catch (error) {
    console.error("Transaction batch import failed:", error.name);
    return { error: "IMPORT_FAILED", message: "Não foi possível importar as transações." };
  }
};

const updateTransaction = async (transactionId, userId, dataTransaction) => {
  try {
    const whereClause = { id: transactionId, user_id: Number(userId) };
    const findTransaction = await Transaction.findOne({
      where: whereClause,
    });
    
    if (!findTransaction) {
      return { error: "NOT_FOUND", message: "Transação não encontrada ou não pertence ao usuário!" };
    }

    const linkedInstallment = await DebtInstallment.findOne({
      where: { transaction_id: findTransaction.id },
    });
    if (linkedInstallment) {
      return {
        error: "CONFLICT",
        message: "Esta despesa está vinculada ao pagamento de uma parcela. Desfaça o pagamento pela página de dívidas.",
      };
    }

    const linkedInvestmentMovement = await InvestmentMovement.findOne({
      where: { transaction_id: findTransaction.id },
    });
    if (linkedInvestmentMovement) {
      return {
        error: "CONFLICT",
        message: "Esta transação está vinculada ao histórico de investimentos e não pode ser editada aqui.",
      };
    }

    const updateData = {};
    for (const field of ["value", "typeId", "description", "date", "status", "isSalary"]) {
      if (Object.prototype.hasOwnProperty.call(dataTransaction, field)) {
        updateData[field] = dataTransaction[field];
      }
    }
    if (Object.prototype.hasOwnProperty.call(dataTransaction, "categoryId")) {
      updateData.category_id = dataTransaction.categoryId;
    }
    
    await Transaction.update(updateData, {
      where: whereClause
    });

    // Busca transação atualizada com categoria
    const updatedTransaction = await Transaction.findOne({
      where: whereClause,
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'icon', 'color']
        }
      ]
    });

    return {
      error: null,
      message: updatedTransaction || `Sucesso ao atualizar transação ID ${dataTransaction.id}`
    };
    
  } catch (error) {
    console.error("Transaction update failed:", error.name);
    return { error: "ERROR", message: "Erro ao atualizar transação" };
  }
};

const deleteTransaction = async (id, userId = null) => {
  try {
    const whereClause = { id };
    
    // ✅ CORREÇÃO: Adiciona verificação de user_id se fornecido
    if (userId) {
      whereClause.user_id = Number(userId);
    }
    
    const transactionToDelete = await Transaction.findOne({ where: whereClause });
    if (!transactionToDelete) {
      return {
        error: "NOT_FOUND",
        message: "Transação não encontrada ou não pertence ao usuário!",
      };
    }

    const linkedInstallment = await DebtInstallment.findOne({
      where: { transaction_id: transactionToDelete.id },
    });
    const linkedInvestmentMovement = await InvestmentMovement.findOne({
      where: { transaction_id: transactionToDelete.id },
    });
    if (linkedInvestmentMovement) {
      return {
        error: "CONFLICT",
        message: "Esta transação está vinculada ao histórico de investimentos e não pode ser excluída do extrato.",
      };
    }

    if (linkedInstallment) {
      const result = await debtService.unpayInstallment(userId, linkedInstallment.id);
      if (result.error) {
        return {
          error: "CONFLICT",
          message: result.error,
        };
      }

      return {
        error: null,
        message: "Pagamento desfeito. A parcela voltou a ficar em aberto e a despesa foi removida do extrato.",
      };
    }
    
    const deletedTransaction = await Transaction.destroy({
      where: whereClause,
    });

    if (!deletedTransaction) {
      return {
        error: "NOT_FOUND",
        message: `Transação não encontrada ou não pertence ao usuário!`,
      };
    }
    
    return { 
      error: null, 
      message: `Transação ID ${id} deletada com sucesso` 
    };
    
  } catch (error) {
    console.error("Transaction deletion failed:", error.name);
    return {
      error: "Bad Request",
      message: `Erro ao deletar transação!`,
    };
  }
};

// ✅ NOVA FUNÇÃO: Buscar categorias por tipo
const getCategoriesByType = async (typeId = null) => {
  try {
    const whereClause = {};
    
    if (typeId) {
      whereClause.type_id = Number(typeId);
    }
    
    const categories = await Category.findAll({
      where: whereClause,
      order: [['name', 'ASC']]
    });

    return { error: null, message: categories };
    
  } catch (error) {
    console.error("Category query failed:", error.name);
    return { error: "DATABASE_ERROR", message: "Erro ao buscar categorias" };
  }
};

// ✅ NOVA FUNÇÃO: Buscar todas as categorias
const getAllCategories = async () => {
  try {
    const categories = await Category.findAll({
      order: [
        ['type_id', 'ASC'],
        ['name', 'ASC']
      ]
    });

    // Agrupa por type_id para facilitar no frontend
    const grouped = categories.reduce((acc, category) => {
      const typeId = category.type_id;
      if (!acc[typeId]) {
        acc[typeId] = [];
      }
      acc[typeId].push(category);
      return acc;
    }, {});

    return { 
      error: null, 
      message: categories,
      grouped 
    };
    
  } catch (error) {
    console.error("Category query failed:", error.name);
    return { error: "DATABASE_ERROR", message: "Erro ao buscar categorias" };
  }
};

module.exports = {
  searchTransactions,
  createTransaction,
  createTransactionsBatch,
  deleteTransaction,
  updateTransaction,
  getCategoriesByType,    // ✅ NOVO
  getAllCategories        // ✅ NOVO
};