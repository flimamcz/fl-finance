// src/app/services/User.service.js
const { User, sequelize } = require("../../models");
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { Op } = require('sequelize');

const SALT_ROUNDS = 10;

// ============================================
// FUNÇÕES PARA PERFIL REAL (COM BANCO DE DADOS)
// ============================================

const getMyProfile = async (userId) => {
  try {
    const user = await User.findOne({
      where: { id: userId },
      attributes: ['fullname', 'email', 'photo', 'createdAt']
    });

    if (!user) {
      return { error: "NOT_FOUND", message: "Usuário não encontrado" };
    }

    const userData = user.toJSON();
    
    // Formatar datas
    userData.joinedDate = userData.createdAt;
    
    return { error: null, message: userData };
    
  } catch (error) {
    console.error("Profile lookup failed:", error.name);
    return { error: "DATABASE_ERROR", message: "Erro ao buscar usuário" };
  }
};

const updateMyProfile = async (userId, updateData) => {
  try {
    // Buscar usuário
    const user = await User.findOne({
      where: { id: userId },
      attributes: ["id", "fullname", "email", "photo", "createdAt"],
    });
    
    if (!user) {
      return { error: "NOT_FOUND", message: "Usuário não encontrado" };
    }
    
    // Validar email se estiver sendo alterado
    if (updateData.email && updateData.email !== user.email) {
      const emailExists = await User.findOne({
        where: { email: updateData.email }
      });
      
      if (emailExists) {
        return { error: "EMAIL_EXISTS", message: "Este email já está em uso" };
      }
    }
    
    // Atualizar campos permitidos (apenas fullname e email pelo seu modelo)
    let updated = false;
    
    if (updateData.name && updateData.name !== user.fullname) {
      user.fullname = updateData.name;
      updated = true;
    }
    
    if (updateData.email && updateData.email !== user.email) {
      user.email = updateData.email;
      updated = true;
    }

    if (updateData.photo !== undefined && updateData.photo !== user.photo) {
      user.photo = updateData.photo || null;
      updated = true;
    }
    
    // Se quiser adicionar birthDate depois, precisa adicionar no modelo
    if (updateData.birthDate) {
      console.log('⚠️ Campo birthDate não existe no modelo. Ignorando.');
    }
    
    if (!updated) {
      return { error: "NO_CHANGES", message: "Nenhuma alteração foi feita" };
    }
    
    await user.save();
    
    // Retornar dados atualizados (sem password)
    const userResponse = {
      fullname: user.fullname,
      email: user.email,
      photo: user.photo,
      createdAt: user.createdAt,
      joinedDate: user.createdAt,
    };
    
    return { error: null, message: userResponse };
    
  } catch (error) {
    console.error("Profile update failed:", error.name);
    return { error: "DATABASE_ERROR", message: "Erro ao atualizar usuário" };
  }
};

const updatePassword = async (userId, currentPassword, newPassword) => {
  try {
    
    // Buscar usuário COM senha (para comparação)
    const user = await User.findOne({ 
      where: { id: userId }
    });
    
    if (!user) {
      return { error: "NOT_FOUND", message: "Usuário não encontrado" };
    }
    
    // 1. VERIFICAR SENHA ATUAL
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    
    if (!isPasswordValid) {
      return { error: "INVALID_PASSWORD", message: "Senha atual incorreta" };
    }
    
    // 2. VALIDAR NOVA SENHA
    if (!newPassword || newPassword.length < 6) {
      return { error: "INVALID_NEW_PASSWORD", message: "A nova senha deve ter pelo menos 6 caracteres" };
    }
    
    // 3. VERIFICAR SE É DIFERENTE DA ATUAL
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return { error: "SAME_PASSWORD", message: "A nova senha não pode ser igual à atual" };
    }
    
    // 4. CRIAR HASH DA NOVA SENHA
    const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    
    // 5. ATUALIZAR NO BANCO
    user.password = newPasswordHash;
    await user.save();
    
    return { error: null, message: "Senha alterada com sucesso" };
    
  } catch (error) {
    console.error("Password update failed:", error.name);
    return { error: "DATABASE_ERROR", message: "Erro ao alterar senha" };
  }
};

// ============================================
// FUNÇÕES EXISTENTES (MANTENHA COMO ESTÃO)
// ============================================

const searchUsers = async () => {
  try {
    const users = await User.findAll({
      attributes: ["id", "fullname", "username", "email", "isAdmin", "createdAt"],
    });

    if (!users || users.length === 0) {
      return { error: "NOT_FOUND", message: "Nenhum usuário encontrado!" };
    }

    return { error: null, message: users };
    
  } catch (error) {
    console.error("User directory lookup failed:", error.name);
    return { error: "DATABASE_ERROR", message: "Erro ao buscar usuários" };
  }
};

const createUser = async (dataUser) => {
  try {
    const username = String(dataUser.username || '').trim().toLowerCase();
    const email = String(dataUser.email || '').trim().toLowerCase();

    if (!/^[a-z0-9._-]{3,30}$/.test(username)) {
      return { error: "INVALID_USERNAME", message: "O usuário deve ter entre 3 e 30 caracteres (letras, números, ponto, hífen ou sublinhado)" };
    }
    
    const existingUser = await User.findOne({
      where: { [Op.or]: [{ email }, { username }] },
    });

    if (existingUser) {
      const duplicateField = existingUser.email === email ? "Email" : "Usuário";
      return { error: "ACCOUNT_EXISTS", message: `${duplicateField} já cadastrado!` };
    }

    // Validar senha
    if (!dataUser.password || dataUser.password.length < 6) {
      return { error: "INVALID_PASSWORD", message: "A senha deve ter pelo menos 6 caracteres" };
    }

    // CRIAR HASH DA SENHA
    const resetCode = String(crypto.randomInt(100000, 1000000));
    const [hashedPassword, resetCodeHash] = await Promise.all([
      bcrypt.hash(dataUser.password, SALT_ROUNDS),
      bcrypt.hash(resetCode, SALT_ROUNDS),
    ]);
    
    const userDataWithHash = {
      fullname: dataUser.fullname || username,
      username,
      email,
      isAdmin: false,
      password: hashedPassword,
      resetCodeHash,
      resetCodeHint: `${resetCode.slice(0, 2)}***${resetCode.slice(-1)}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Criar usuário no banco
    const createUserRequest = await User.create(userDataWithHash);

    if (!createUserRequest) {
      return { error: "CREATE_ERROR", message: "Erro ao criar conta!" };
    }
    
    // Remove a senha do retorno (segurança)
    const userWithoutPassword = createUserRequest.toJSON();
    delete userWithoutPassword.password;
    delete userWithoutPassword.resetCodeHash;
    userWithoutPassword.recoveryCode = resetCode;
    
    return { error: null, message: userWithoutPassword };
    
  } catch (error) {
    console.error("Account creation failed:", error.name);
    return { error: "DATABASE_ERROR", message: "Erro ao criar usuário" };
  }
};

const resetPassword = async (email, code, newPassword) => {
  return sequelize.transaction(async (transaction) => {
    const user = await User.findOne({
      where: { email },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!user?.resetCodeHash || !await bcrypt.compare(code, user.resetCodeHash)) {
      return { error: "INVALID_CODE", message: "Email ou código de recuperação inválidos." };
    }

    const recoveryCode = String(crypto.randomInt(100000, 1000000));
    [user.password, user.resetCodeHash] = await Promise.all([
      bcrypt.hash(newPassword, SALT_ROUNDS),
      bcrypt.hash(recoveryCode, SALT_ROUNDS),
    ]);
    user.resetCodeHint = `${recoveryCode.slice(0, 2)}***${recoveryCode.slice(-1)}`;
    await user.save({ transaction });
    return {
      error: null,
      message: "Senha redefinida com sucesso. Guarde seu novo código de recuperação.",
      recoveryCode,
    };
  });
};

const findUserForLogin = async (identifier) => {
  try {
    const normalizedIdentifier = String(identifier || '').trim().toLowerCase();
    
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { email: normalizedIdentifier },
          { username: normalizedIdentifier },
        ],
      },
    });

    if (!user) {
      return { error: "USER_NOT_FOUND", message: "Usuário não encontrado" };
    }

    return { error: null, message: user };
    
  } catch (error) {
    console.error("Login account lookup failed:", error.name);
    return { error: "DATABASE_ERROR", message: "Erro ao buscar usuário para login" };
  }
};

const verifyCredentials = async (email, password) => {
  try {
    const user = await User.findOne({
      where: { email }
    });
    
    if (!user) {
      return { error: "USER_NOT_FOUND", message: "Email ou senha incorretos" };
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return { error: "INVALID_PASSWORD", message: "Email ou senha incorretos" };
    }
    
    // Remover senha do objeto de retorno
    const userWithoutPassword = user.toJSON();
    delete userWithoutPassword.password;
    
    return { error: null, message: userWithoutPassword };
    
  } catch (error) {
    console.error("Credential verification failed:", error.name);
    return { error: "DATABASE_ERROR", message: "Erro ao verificar credenciais" };
  }
};

// ============================================
// EXPORTAÇÃO
// ============================================

module.exports = {
  // Funções principais
  createUser,
  searchUsers,
  getMyProfile,
  updateMyProfile,
  updatePassword,
  verifyCredentials,
  findUserForLogin,
  resetPassword,
};