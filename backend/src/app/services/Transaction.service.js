// src/app/services/Transaction.service.js - VERSÃO COM CATEGORIAS
const { Op } = require("sequelize");
const { Transaction, Category, Debt, DebtInstallment, InvestmentMovement } = require("../../models");
const debtService = require("./Debt.service");

const searchTransactions = async (userId = null) => {
  console.log('🔍 Service: Buscando transações para userId:', userId);
  
  const whereClause = {};
  
  if (userId) {
    whereClause.user_id = Number(userId);
    console.log('🛠️ Usando filtro: { user_id:', userId, '}');
  } else {
    console.log('⚠️ AVISO: userId não fornecido, buscando TODAS as transações');
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

    console.log(`✅ Service: Encontradas ${transactions.length} transações`);
    
    // Log para debug
    if (transactions.length > 0) {
      const firstTrans = transactions[0].toJSON();
      console.log('🔍 Transação com categoria:', {
        id: firstTrans.id,
        description: firstTrans.description,
        category: firstTrans.category
      });
    }

    return { error: null, message: transactionsWithDebtInstallments };
    
  } catch (error) {
    console.error('❌ Service ERROR:', error.message);
    console.error('❌ Stack:', error.stack);
    return { error: "DATABASE_ERROR", message: "Erro ao buscar transações" };
  }
};

const createTransaction = async (dataTransaction) => {
  console.log('📝 Service: Criando transação com dados:', dataTransaction);
  
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
    
    console.log('📤 Dados para salvar no banco:', dataToSave);
    
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
    
    console.log('✅ Transação criada com categoria:', transactionWithCategory.toJSON());
    
    return { error: null, message: transactionWithCategory };
  } catch (error) {
    console.error('❌ Erro ao criar transação:', error);
    return { error: "Bad Request", message: "Erro ao criar transação!" };
  }
};

const updateTransaction = async (dataTransaction) => {
  console.log('🔄 Service: Atualizando transação:', dataTransaction);
  
  try {
    // ✅ CORREÇÃO: Verifica também pelo user_id para segurança
    const whereClause = { id: dataTransaction.id };
    
    // Se tiver userId no update, adiciona à verificação
    if (dataTransaction.userId) {
      whereClause.user_id = dataTransaction.userId;
    } else if (dataTransaction.user_id) {
      whereClause.user_id = dataTransaction.user_id;
    }
    
    console.log('🔍 Verificando transação com where:', whereClause);
    
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

    // Remove campos que não devem ser atualizados
    const updateData = { ...dataTransaction };
    delete updateData.id;
    
    // Converte userId para user_id se necessário
    if (updateData.userId !== undefined) {
      updateData.user_id = updateData.userId;
      delete updateData.userId;
    }
    
    // ✅ NOVO: Trata categoryId
    if (updateData.categoryId !== undefined) {
      updateData.category_id = updateData.categoryId;
      delete updateData.categoryId;
    }
    
    await Transaction.update(updateData, {
      where: { id: dataTransaction.id }
    });

    // Busca transação atualizada com categoria
    const updatedTransaction = await Transaction.findByPk(dataTransaction.id, {
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
    console.error('❌ Erro ao atualizar:', error);
    return { error: "ERROR", message: "Erro ao atualizar transação" };
  }
};

const deleteTransaction = async (id, userId = null) => {
  console.log('🗑️ Service: Deletando transação ID:', id, 'para userId:', userId);
  
  try {
    const whereClause = { id };
    
    // ✅ CORREÇÃO: Adiciona verificação de user_id se fornecido
    if (userId) {
      whereClause.user_id = Number(userId);
    }
    
    console.log('🔍 Deletando com where:', whereClause);

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
    console.error('❌ Erro ao deletar:', error);
    return {
      error: "Bad Request",
      message: `Erro ao deletar transação!`,
    };
  }
};

// ✅ NOVA FUNÇÃO: Buscar categorias por tipo
const getCategoriesByType = async (typeId = null) => {
  console.log('🏷️ Service: Buscando categorias para typeId:', typeId);
  
  try {
    const whereClause = {};
    
    if (typeId) {
      whereClause.type_id = Number(typeId);
    }
    
    const categories = await Category.findAll({
      where: whereClause,
      order: [['name', 'ASC']]
    });

    console.log(`✅ Service: Encontradas ${categories.length} categorias`);
    
    return { error: null, message: categories };
    
  } catch (error) {
    console.error('❌ Service ERROR (categorias):', error.message);
    return { error: "DATABASE_ERROR", message: "Erro ao buscar categorias" };
  }
};

// ✅ NOVA FUNÇÃO: Buscar todas as categorias
const getAllCategories = async () => {
  console.log('🏷️ Service: Buscando TODAS as categorias');
  
  try {
    const categories = await Category.findAll({
      order: [
        ['type_id', 'ASC'],
        ['name', 'ASC']
      ]
    });

    console.log(`✅ Service: Encontradas ${categories.length} categorias no total`);
    
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
    console.error('❌ Service ERROR (todas categorias):', error.message);
    return { error: "DATABASE_ERROR", message: "Erro ao buscar categorias" };
  }
};

module.exports = {
  searchTransactions,
  createTransaction,
  deleteTransaction,
  updateTransaction,
  getCategoriesByType,    // ✅ NOVO
  getAllCategories        // ✅ NOVO
};