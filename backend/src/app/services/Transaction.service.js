// src/app/services/Transaction.service.js - VERSÃO COM CATEGORIAS
const { Transaction, Category } = require("../../models");

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

    return { error: null, message: transactions };
    
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