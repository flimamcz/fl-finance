// src/app/controllers/Transaction.controller.js - VERSÃO COM CATEGORIAS
const transactionService = require("../services/Transaction.service");

const searchTrasctions = async (req, res) => {
  try {
    console.log('🔍 Controller: Iniciando busca de transações...');
    
    // Verificar se o usuário está autenticado
    if (!req.user || !req.user.id) {
      console.log('❌ Controller: Usuário não autenticado!');
      return res.status(401).json({ 
        error: true, 
        message: "Usuário não autenticado" 
      });
    }
    
    const userId = req.user.id;
    console.log('✅ Controller: Usuário autenticado, ID:', userId);
    
    // Passar userId para o service
    const { error, message } = await transactionService.searchTransactions(userId);
    
    console.log('📊 Controller: Resultado do service - error:', error, 'message length:', message?.length || 0);

    if (error) {
      console.log('❌ Controller: Service retornou erro:', error);
      return res.status(404).json({ 
        error: true, 
        message 
      });
    }

    console.log(`✅ Controller: Retornando ${message.length} transações`);
    
    // ✅ MELHORIA: Formata resposta para incluir categoria de forma amigável
    const formattedData = message.map(transaction => {
      const trans = transaction.toJSON ? transaction.toJSON() : transaction;
      return {
        ...trans,
        category: trans.category || null
      };
    });

    return res.status(200).json({
      error: false,
      data: formattedData,
      count: formattedData.length
    });
    
  } catch (error) {
    console.error('❌ Controller ERROR:', error.message);
    console.error('❌ Stack:', error.stack);
    return res.status(500).json({ 
      error: true, 
      message: "Erro interno no servidor" 
    });
  }
};

const createTrasaction = async (req, res) => {
  try {
    console.log('📝 Controller: Criando nova transação...');
    console.log('👤 req.user:', req.user);
    console.log('📦 req.body:', req.body);
    
    // Verificar autenticação
    if (!req.user || !req.user.id) {
      return res.status(401).json({ 
        error: true, 
        message: "Usuário não autenticado" 
      });
    }
    
    const { value, typeId, categoryId, description, date, status, isSalary } = req.body;
    
    // Validar campos obrigatórios
    if (!value || !description || !date) {
      return res.status(400).json({ 
        error: true, 
        message: "Campos obrigatórios: value, description, date" 
      });
    }
    
    // ✅ NOVO: Valida categoryId se fornecido
    if (categoryId && typeof categoryId !== 'number') {
      return res.status(400).json({ 
        error: true, 
        message: "categoryId deve ser um número" 
      });
    }

    if (isSalary !== undefined && typeof isSalary !== "boolean") {
      return res.status(400).json({
        error: true,
        message: "isSalary deve ser verdadeiro ou falso"
      });
    }

    if (isSalary === true && Number(typeId) !== 1) {
      return res.status(400).json({
        error: true,
        message: "Somente uma receita pode ser marcada como salário"
      });
    }
    
    const transactionData = { 
      value, 
      typeId, 
      description, 
      date, 
      status: status !== undefined ? status : true,
      isSalary: Number(typeId) === 1 && isSalary === true,
      user_id: req.user.id
    };
    
    // ✅ NOVO: Adiciona categoryId se fornecido
    if (categoryId) {
      transactionData.categoryId = categoryId;
    }
    
    console.log('📤 Controller: Enviando para service:', transactionData);
    
    const { error, message } = await transactionService.createTransaction(transactionData);

    if (error) {
      return res.status(400).json({ 
        error: true, 
        message 
      });
    }

    const returnMessage = {
      error: false,
      message: "Transação criada com sucesso!",
      data: message
    };

    return res.status(201).json(returnMessage);
    
  } catch (error) {
    console.error('❌ Controller ERROR:', error);
    return res.status(500).json({ 
      error: true, 
      message: "Erro interno no servidor" 
    });
  }
};

const importTransactions = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: true, message: "Usuário não autenticado" });
    }

    const { transactions } = req.body || {};
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ error: true, message: "Envie ao menos uma transação para importar." });
    }
    if (transactions.length > 500) {
      return res.status(413).json({ error: true, message: "Importe no máximo 500 transações por vez." });
    }

    const normalizedTransactions = [];
    for (const [index, transaction] of transactions.entries()) {
      const rowNumber = index + 1;
      const value = Number(transaction?.value);
      const typeId = Number(transaction?.typeId);
      const description = typeof transaction?.description === "string"
        ? transaction.description.trim()
        : "";
      const date = String(transaction?.date || "");
      const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(date)
        ? new Date(`${date}T00:00:00.000Z`)
        : null;

      if (!Number.isFinite(value) || value <= 0) {
        return res.status(400).json({ error: true, message: `Linha ${rowNumber}: o valor precisa ser maior que zero.` });
      }
      if (![1, 2, 3].includes(typeId)) {
        return res.status(400).json({ error: true, message: `Linha ${rowNumber}: selecione receita, despesa ou investimento.` });
      }
      if (!description || description.length > 255) {
        return res.status(400).json({ error: true, message: `Linha ${rowNumber}: descrição obrigatória com até 255 caracteres.` });
      }
      if (!parsedDate || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) {
        return res.status(400).json({ error: true, message: `Linha ${rowNumber}: data inválida.` });
      }
      if (typeof transaction.status !== "boolean" || typeof transaction.isSalary !== "boolean") {
        return res.status(400).json({ error: true, message: `Linha ${rowNumber}: status ou identificação de salário inválidos.` });
      }
      if (typeId !== 1 && transaction.isSalary) {
        return res.status(400).json({ error: true, message: `Linha ${rowNumber}: somente receitas podem ser marcadas como salário.` });
      }

      normalizedTransactions.push({
        value,
        typeId,
        description,
        date,
        status: transaction.status,
        isSalary: transaction.isSalary,
      });
    }

    const result = await transactionService.createTransactionsBatch(req.user.id, normalizedTransactions);
    if (result.error) {
      return res.status(500).json({ error: true, message: result.message });
    }

    return res.status(201).json({ error: false, count: result.count });
  } catch (error) {
    console.error("Erro ao importar transações:", error);
    return res.status(500).json({ error: true, message: "Erro interno ao importar transações." });
  }
};

const updateTransaction = async (req, res) => {
  try {
    console.log('🔄 Controller: Atualizando transação...');
    console.log('👤 req.user:', req.user);
    console.log('📦 req.body:', req.body);
    
    // Verificar autenticação
    if (!req.user || !req.user.id) {
      return res.status(401).json({ 
        error: true, 
        message: "Usuário não autenticado" 
      });
    }
    
    if (!req.body.id) {
      return res.status(400).json({ 
        error: true, 
        message: "ID da transação é obrigatório" 
      });
    }
    
    const updateData = {
      ...req.body,
      user_id: req.user.id
    };

    if (updateData.isSalary !== undefined && typeof updateData.isSalary !== "boolean") {
      return res.status(400).json({
        error: true,
        message: "isSalary deve ser verdadeiro ou falso"
      });
    }

    if (updateData.isSalary === true && Number(updateData.typeId) !== 1) {
      return res.status(400).json({
        error: true,
        message: "Somente uma receita pode ser marcada como salário"
      });
    }
    if (updateData.typeId !== undefined && Number(updateData.typeId) !== 1 && updateData.isSalary === undefined) {
      updateData.isSalary = false;
    }
    
    // ✅ NOVO: Valida categoryId se fornecido
    if (updateData.categoryId && typeof updateData.categoryId !== 'number') {
      return res.status(400).json({ 
        error: true, 
        message: "categoryId deve ser um número" 
      });
    }
    
    console.log('📤 Controller: Enviando para service:', updateData);
    
    const { error, message } = await transactionService.updateTransaction(updateData);
    
    if (error) {
      return res.status(400).json({ 
        error: true, 
        message 
      });
    }

    return res.status(200).json({ 
      error: false,
      message: typeof message === 'string' ? message : "Transação atualizada com sucesso!",
      data: typeof message === 'object' ? message : undefined
    });
    
  } catch (error) {
    console.error('❌ Controller ERROR:', error);
    return res.status(500).json({ 
      error: true, 
      message: "Erro interno no servidor" 
    });
  }
};

const deleteTransaction = async (req, res) => {
  try {
    console.log('🗑️ Controller: Deletando transação...');
    console.log('👤 req.user:', req.user);
    console.log('🎯 req.params:', req.params);
    
    // Verificar autenticação
    if (!req.user || !req.user.id) {
      return res.status(401).json({ 
        error: true, 
        message: "Usuário não autenticado" 
      });
    }
    
    const transactionId = req.params.id;
    const userId = req.user.id;
    
    if (!transactionId) {
      return res.status(400).json({ 
        error: true, 
        message: "ID da transação é obrigatório" 
      });
    }
    
    console.log(`🗑️ Usuário ${userId} deletando transação ${transactionId}`);
    
    const { error, message } = await transactionService.deleteTransaction(transactionId, userId);

    if (error) {
      return res.status(400).json({ 
        error: true, 
        message 
      });
    }

    return res.status(200).json({ 
      error: false,
      message 
    });
    
  } catch (error) {
    console.error('❌ Controller ERROR:', error);
    return res.status(500).json({ 
      error: true, 
      message: "Erro interno no servidor" 
    });
  }
};

// ✅ NOVO CONTROLLER: Buscar categorias por tipo
const getCategoriesByType = async (req, res) => {
  try {
    console.log('🏷️ Controller: Buscando categorias por tipo...');
    console.log('🎯 req.params:', req.params);
    
    const { typeId } = req.params;
    
    if (!typeId) {
      return res.status(400).json({ 
        error: true, 
        message: "typeId é obrigatório" 
      });
    }
    
    const typeIdNumber = parseInt(typeId, 10);
    
    if (isNaN(typeIdNumber) || typeIdNumber < 1 || typeIdNumber > 3) {
      return res.status(400).json({ 
        error: true, 
        message: "typeId deve ser 1 (Receita), 2 (Despesa) ou 3 (Investimento)" 
      });
    }
    
    const { error, message } = await transactionService.getCategoriesByType(typeIdNumber);
    
    if (error) {
      return res.status(404).json({ 
        error: true, 
        message 
      });
    }

    console.log(`✅ Controller: Retornando ${message.length} categorias para tipo ${typeId}`);
    
    return res.status(200).json({
      error: false,
      data: message,
      count: message.length,
      typeId: typeIdNumber
    });
    
  } catch (error) {
    console.error('❌ Controller ERROR (categorias):', error.message);
    return res.status(500).json({ 
      error: true, 
      message: "Erro interno no servidor" 
    });
  }
};

// ✅ NOVO CONTROLLER: Buscar todas as categorias
const getAllCategories = async (req, res) => {
  try {
    console.log('🏷️ Controller: Buscando TODAS as categorias...');
    
    const { error, message, grouped } = await transactionService.getAllCategories();
    
    if (error) {
      return res.status(404).json({ 
        error: true, 
        message 
      });
    }

    console.log(`✅ Controller: Retornando ${message.length} categorias no total`);
    
    return res.status(200).json({
      error: false,
      data: message,
      grouped: grouped || {},
      count: message.length
    });
    
  } catch (error) {
    console.error('❌ Controller ERROR (todas categorias):', error.message);
    return res.status(500).json({ 
      error: true, 
      message: "Erro interno no servidor" 
    });
  }
};

// ✅ NOVO CONTROLLER: Validar categoria (opcional)
const validateCategory = async (req, res) => {
  try {
    console.log('✅ Controller: Validando categoria...');
    console.log('📦 req.body:', req.body);
    
    const { categoryId, typeId } = req.body;
    
    if (!categoryId || !typeId) {
      return res.status(400).json({ 
        error: true, 
        message: "categoryId e typeId são obrigatórios" 
      });
    }
    
    // Busca categorias do tipo especificado
    const { error, message } = await transactionService.getCategoriesByType(typeId);
    
    if (error) {
      return res.status(404).json({ 
        error: true, 
        message 
      });
    }
    
    // Verifica se a categoria existe e pertence ao tipo correto
    const categoryExists = message.some(cat => cat.id === categoryId);
    
    if (!categoryExists) {
      return res.status(400).json({ 
        error: true, 
        message: "Categoria não encontrada ou não pertence ao tipo especificado" 
      });
    }
    
    return res.status(200).json({
      error: false,
      message: "Categoria válida",
      valid: true
    });
    
  } catch (error) {
    console.error('❌ Controller ERROR (validar categoria):', error.message);
    return res.status(500).json({ 
      error: true, 
      message: "Erro interno no servidor" 
    });
  }
};

module.exports = {
  searchTrasctions,
  createTrasaction,
  importTransactions,
  deleteTransaction,
  updateTransaction,
  getCategoriesByType,    // ✅ NOVO
  getAllCategories,       // ✅ NOVO
  validateCategory        // ✅ NOVO (opcional)
};