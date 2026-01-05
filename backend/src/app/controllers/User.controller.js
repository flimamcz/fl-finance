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

const getMyProfile = async (req, res) => {
  try {
    console.log("👤 Controller getMyProfile: Iniciando...");

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        error: true,
        message: "Usuário não autenticado",
      });
    }

    const userId = req.user.id;
    console.log("🔍 Buscando perfil do usuário ID:", userId);

    // Chamar service REAL
    const { error, message } = await userService.getMyProfile(userId);

    if (error === "NOT_FOUND") {
      return res.status(404).json({
        error: true,
        message: "Usuário não encontrado",
      });
    }

    if (error) {
      return res.status(400).json({
        error: true,
        message,
      });
    }

    console.log("✅ Dados retornados do banco");

    return res.status(200).json({
      error: false,
      data: message,
    });
  } catch (error) {
    console.error("❌ Controller ERROR getMyProfile:", error.message);
    return res.status(500).json({
      error: true,
      message: "Erro interno ao buscar perfil",
    });
  }
};

const updateMyProfile = async (req, res) => {
  try {
    console.log("🔄 Controller updateMyProfile: Iniciando...");

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        error: true,
        message: "Usuário não autenticado",
      });
    }

    const { name, email, birthDate } = req.body;
    const userId = req.user.id;

    console.log(`📝 Tentando atualizar usuário ${userId}:`, {
      name,
      email,
      birthDate,
    });

    // Validações básicas
    if (!name && !email) {
      return res.status(400).json({
        error: true,
        message: "Pelo menos um campo deve ser fornecido para atualização",
      });
    }

    if (email && !email.includes("@")) {
      return res.status(400).json({
        error: true,
        message: "Email inválido",
      });
    }

    // Chamar service REAL
    const { error, message } = await userService.updateMyProfile(userId, {
      name,
      email,
      birthDate,
    });

    if (error === "EMAIL_EXISTS") {
      return res.status(400).json({
        error: true,
        message,
      });
    }

    if (error === "NO_CHANGES") {
      return res.status(400).json({
        error: true,
        message,
      });
    }

    if (error) {
      return res.status(400).json({
        error: true,
        message,
      });
    }

    console.log("✅ Perfil atualizado com sucesso");

    return res.status(200).json({
      error: false,
      message: "Perfil atualizado com sucesso!",
      data: message,
    });
  } catch (error) {
    console.error("❌ Controller ERROR updateMyProfile:", error.message);
    return res.status(500).json({
      error: true,
      message: "Erro interno ao atualizar perfil",
    });
  }
};

const updatePassword = async (req, res) => {
  try {
    console.log("🔐 Controller updatePassword: Iniciando...");

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        error: true,
        message: "Usuário não autenticado",
      });
    }

    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    console.log(`🔑 Usuário ${userId} tentando alterar senha`);

    // Validações
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: true,
        message: "Senha atual e nova senha são obrigatórias",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        error: true,
        message: "A nova senha deve ter pelo menos 6 caracteres",
      });
    }

    // CHAMAR SERVICE REAL
    const { error, message } = await userService.updatePassword(
      userId,
      currentPassword,
      newPassword
    );

    if (error === "INVALID_PASSWORD") {
      return res.status(400).json({
        error: true,
        message,
      });
    }

    if (error === "SAME_PASSWORD") {
      return res.status(400).json({
        error: true,
        message,
      });
    }

    if (error) {
      return res.status(400).json({
        error: true,
        message,
      });
    }

    console.log("✅ Senha alterada com sucesso");

    return res.status(200).json({
      error: false,
      message: "Senha alterada com sucesso!",
    });
  } catch (error) {
    console.error("❌ Controller ERROR updatePassword:", error.message);
    return res.status(500).json({
      error: true,
      message: "Erro interno ao alterar senha",
    });
  }
};

// ============================================
// EXPORTAR TODAS AS FUNÇÕES
// ============================================

module.exports = {
  createUser,
  searchUsers,
  getMyProfile,
  updateMyProfile,
  updatePassword,
};
