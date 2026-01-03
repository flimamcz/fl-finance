// src/app/services/Transaction.service.js
const { Transaction } = require("../../models");

const searchTransactions = async (userId = null) => {
  console.log('🔍 Service: Buscando transações para userId:', userId);
  console.log('📊 Tipo do userId:', typeof userId);
  
  // DEBUG: Veja a estrutura REAL do modelo
  console.log('🔧 Atributos do modelo Transaction:');
  Object.keys(Transaction.rawAttributes).forEach(attr => {
    console.log(`  - ${attr}: ${Transaction.rawAttributes[attr].field || attr}`);
  });
  
  const whereClause = {};
  
  if (userId) {
    // ✅ CORREÇÃO: Use user_id (snake_case) que está no BANCO
    // O Sequelize com `underscored: true` converte automaticamente
    whereClause.user_id = Number(userId); // ← MUDOU AQUI!
    console.log('🛠️ Usando filtro: { user_id:', userId, '}');
  } else {
    console.log('⚠️ AVISO: userId não fornecido, buscando TODAS as transações');
  }
  
  try {
    const transactions = await Transaction.findAll({
      where: whereClause,
      order: [['date', 'DESC']]
    });

    console.log(`✅ Service: Encontradas ${transactions.length} transações`);
    
    // DEBUG: Ver estrutura REAL
    if (transactions.length > 0) {
      const firstTrans = transactions[0].toJSON();
      console.log('🔍 DEBUG - ESTRUTURA da primeira transação:');
      console.log(JSON.stringify(firstTrans, null, 2));
      console.log('🔍 Campos relacionados a usuário:');
      console.log('  userId:', firstTrans.userId);
      console.log('  user_id:', firstTrans.user_id);
      console.log('  user:', firstTrans.user);
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
    
    console.log('📤 Dados para salvar no banco:', dataToSave);
    
    const newTransaction = await Transaction.create(dataToSave);
    console.log('✅ Transação criada:', newTransaction.toJSON());
    
    return { error: null, message: newTransaction };
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
    
    await Transaction.update(updateData, {
      where: { id: dataTransaction.id }
    });

    return {
      error: null,
      message: `Sucesso ao atualizar transação ID ${dataTransaction.id}`
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

module.exports = {
  searchTransactions,
  createTransaction,
  deleteTransaction,
  updateTransaction,
};