// src/app/controllers/Transaction.controller.js
const transactionService = require("../services/Transaction.service");

const searchTrasctions = async (req, res) => {
  try {
    console.log('🔍 Controller: Iniciando busca de transações...');
    console.log('👤 Controller - req.user:', req.user);
    console.log('👤 Controller - req.user.id:', req.user?.id);
    
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
    return res.status(200).json({
      error: false,
      data: message,
      count: message.length
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
    
    const { value, typeId, description, date, status } = req.body;
    
    // Validar campos obrigatórios
    if (!value || !description || !date) {
      return res.status(400).json({ 
        error: true, 
        message: "Campos obrigatórios: value, description, date" 
      });
    }
    
    // ✅ CORREÇÃO: Usar user_id em vez de userId
    const transactionData = { 
      value, 
      typeId, 
      description, 
      date, 
      status,
      user_id: req.user.id // ✅ MUDOU PARA user_id (snake_case)
    };
    
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
    
    // ✅ CORREÇÃO: Usar user_id em vez de userId
    const updateData = {
      ...req.body,
      user_id: req.user.id // ✅ MUDOU PARA user_id (snake_case)
    };
    
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
    
    // ✅ CORREÇÃO: Passa userId também para verificação no service
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

module.exports = {
  searchTrasctions,
  createTrasaction,
  deleteTransaction,
  updateTransaction,
};