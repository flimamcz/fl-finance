// src/app/controllers/User.controller.js
const userService = require("../services/User.service");

const searchUsers = async (req, res) => {
  const { error, message } = await userService.searchUsers();

  if (error) {
    return res.status(404).json(message);
  }

  return res.status(200).json(message);
};

const createUser = async (req, res) => {
  const {
    fullname,
    user_pf,
    email,
    password,
    positionWork,
    createdAt,
    updatedAt,
  } = req.body;
  const { error, message } = await userService.createUser({
    fullname,
    user_pf,
    email,
    password,
    positionWork,
    createdAt,
    updatedAt,
  });

  if (error) {
    return res.status(400).json({ message });
  }

  const createdUser = {
    message: "Usuário criado com sucesso!",
    operation: message,
  };

  return res.status(200).json(createdUser);
};

// ============================================
// NOVAS FUNÇÕES PARA PERFIL
// ============================================

const getMyProfile = async (req, res) => {
  try {
    console.log('👤 Controller getMyProfile: Iniciando...');
    console.log('👤 Usuário autenticado:', req.user);
    
    if (!req.user || !req.user.id) {
      return res.status(401).json({ 
        error: true, 
        message: "Usuário não autenticado" 
      });
    }
    
    const userId = req.user.id;
    console.log('🔍 Buscando perfil do usuário ID:', userId);
    
    // TODO: Implementar no service para buscar do banco
    // Por enquanto retorna dados mockados baseados no token
    const userData = {
      id: userId,
      name: req.user.name || "Usuário Teste",
      email: req.user.email || "usuario@email.com",
      birthDate: "2001-10-12", // Default - buscar do banco depois
      createdAt: "2024-01-15T10:30:00Z",
      lastLogin: new Date().toISOString()
    };
    
    console.log('✅ Dados retornados:', userData);
    
    return res.status(200).json({
      error: false,
      data: userData
    });
    
  } catch (error) {
    console.error('❌ Controller ERROR getMyProfile:', error.message);
    console.error('❌ Stack:', error.stack);
    return res.status(500).json({ 
      error: true, 
      message: "Erro interno ao buscar perfil" 
    });
  }
};

const updateMyProfile = async (req, res) => {
  try {
    console.log('🔄 Controller updateMyProfile: Iniciando...');
    console.log('👤 Usuário:', req.user);
    console.log('📦 Body recebido:', req.body);
    
    if (!req.user || !req.user.id) {
      return res.status(401).json({ 
        error: true, 
        message: "Usuário não autenticado" 
      });
    }
    
    const { name, email, birthDate } = req.body;
    const userId = req.user.id;
    
    console.log(`📝 Tentando atualizar usuário ${userId}:`, { name, email, birthDate });
    
    // Validações básicas
    if (!name || !email) {
      return res.status(400).json({ 
        error: true, 
        message: "Nome e email são obrigatórios" 
      });
    }
    
    if (email && !email.includes('@')) {
      return res.status(400).json({ 
        error: true, 
        message: "Email inválido" 
      });
    }
    
    // TODO: Implementar no service para atualizar no banco
    // Por enquanto simula sucesso
    
    console.log('✅ Perfil atualizado com sucesso (mock)');
    
    return res.status(200).json({
      error: false,
      message: "Perfil atualizado com sucesso!",
      data: { 
        id: userId,
        name, 
        email, 
        birthDate,
        updatedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Controller ERROR updateMyProfile:', error.message);
    return res.status(500).json({ 
      error: true, 
      message: "Erro interno ao atualizar perfil" 
    });
  }
};

const updatePassword = async (req, res) => {
  try {
    console.log('🔐 Controller updatePassword: Iniciando...');
    
    if (!req.user || !req.user.id) {
      return res.status(401).json({ 
        error: true, 
        message: "Usuário não autenticado" 
      });
    }
    
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;
    
    // Validações
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        error: true, 
        message: "Senha atual e nova senha são obrigatórias" 
      });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ 
        error: true, 
        message: "A nova senha deve ter pelo menos 6 caracteres" 
      });
    }
    
    // CHAMAR SERVICE REAL (com hash)
    const { error, message } = await userService.updatePassword(
      userId, 
      currentPassword, 
      newPassword
    );
    
    if (error === "INVALID_PASSWORD") {
      return res.status(400).json({ 
        error: true, 
        message: message 
      });
    }
    
    if (error) {
      return res.status(400).json({ 
        error: true, 
        message: message 
      });
    }
    
    console.log('✅ Senha alterada com sucesso');
    
    return res.status(200).json({
      error: false,
      message: "Senha alterada com sucesso!"
    });
    
  } catch (error) {
    console.error('❌ Controller ERROR updatePassword:', error.message);
    return res.status(500).json({ 
      error: true, 
      message: "Erro interno ao alterar senha" 
    });
  }
};
// ============================================
// EXPORTAR TODAS AS FUNÇÕES
// ============================================

module.exports = {
  // Funções existentes
  createUser,
  searchUsers,
  
  // Novas funções para perfil
  getMyProfile,
  updateMyProfile,
  updatePassword
};