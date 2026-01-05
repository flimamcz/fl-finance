// src/app/services/User.service.js
const { User } = require("../../models");
const bcrypt = require("bcryptjs"); // Usando bcryptjs para compatibilidade

const SALT_ROUNDS = 10; // Fator de custo para hash

// ============================================
// FUNÇÕES DE CRIAÇÃO E BUSCA
// ============================================

const searchUsers = async () => {
  try {
    console.log("🔍 Service: Buscando todos os usuários");

    const users = await User.findAll({
      attributes: { exclude: ["password"] }, // NUNCA retorna senha!
    });

    if (!users || users.length === 0) {
      return { error: "NOT_FOUND", message: "Nenhum usuário encontrado!" };
    }

    console.log(`✅ Encontrados ${users.length} usuários`);
    return { error: null, message: users };
  } catch (error) {
    console.error("❌ Service ERROR searchUsers:", error);
    return { error: "DATABASE_ERROR", message: "Erro ao buscar usuários" };
  }
};

const createUser = async (dataUser) => {
  try {
    console.log("🔐 Service createUser: Criando novo usuário");
    console.log("📧 Email fornecido:", dataUser.email);

    // Verificar se email já existe
    const findUserByEmail = await User.findOne({
      where: { email: dataUser.email },
    });

    if (findUserByEmail) {
      console.log("❌ Email já cadastrado:", dataUser.email);
      return { error: "EMAIL_EXISTS", message: "Email já cadastrado!" };
    }

    // Validar senha
    if (!dataUser.password || dataUser.password.length < 6) {
      return {
        error: "INVALID_PASSWORD",
        message: "A senha deve ter pelo menos 6 caracteres",
      };
    }

    // CRIAR HASH DA SENHA
    const hashedPassword = bcrypt.hashSync(dataUser.password, SALT_ROUNDS);

    const userDataWithHash = {
      ...dataUser,
      password: hashedPassword, // Senha criptografada
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.log("✅ Senha criptografada com sucesso");

    // Criar usuário no banco
    const createUserRequest = await User.create(userDataWithHash);

    if (!createUserRequest) {
      return { error: "CREATE_ERROR", message: "Erro ao criar conta!" };
    }

    // Remove a senha do retorno (segurança)
    const userWithoutPassword = createUserRequest.toJSON();
    delete userWithoutPassword.password;

    console.log("✅ Usuário criado com sucesso:", userWithoutPassword.email);

    return { error: null, message: userWithoutPassword };
  } catch (error) {
    console.error("❌ Service ERROR createUser:", error);
    return { error: "DATABASE_ERROR", message: "Erro ao criar usuário" };
  }
};

// ============================================
// FUNÇÕES DE PERFIL DO USUÁRIO
// ============================================

const getMyProfile = async (userId) => {
  try {
    console.log("👤 Service getMyProfile: Buscando usuário ID:", userId);

    const user = await User.findOne({
      where: { id: userId },
      attributes: { exclude: ["password"] }, // Nunca retorna senha!
    });

    if (!user) {
      return { error: "NOT_FOUND", message: "Usuário não encontrado" };
    }

    // Formatar datas para melhor visualização
    const userData = user.toJSON();

    if (userData.createdAt) {
      userData.joinedDate = new Date(userData.createdAt).toISOString();
    }

    console.log("✅ Perfil encontrado:", userData.email);
    return { error: null, message: userData };
  } catch (error) {
    console.error("❌ Service ERROR getMyProfile:", error);
    return { error: "DATABASE_ERROR", message: "Erro ao buscar usuário" };
  }
};

const updateMyProfile = async (userId, updateData) => {
  try {
    console.log("🔄 Service updateMyProfile:", userId);
    console.log("📝 Dados para atualizar:", updateData);

    // Buscar usuário
    const user = await User.findOne({
      where: { id: userId },
      attributes: { exclude: ["password"] },
    });

    if (!user) {
      return { error: "NOT_FOUND", message: "Usuário não encontrado" };
    }

    // Validar email se estiver sendo alterado
    if (updateData.email && updateData.email !== user.email) {
      const emailExists = await User.findOne({
        where: { email: updateData.email },
      });

      if (emailExists) {
        return { error: "EMAIL_EXISTS", message: "Este email já está em uso" };
      }
    }

    // Atualizar campos permitidos
    const allowedFields = ["fullname", "email", "positionWork", "user_pf"];

    let updated = false;
    allowedFields.forEach((field) => {
      if (
        updateData[field] !== undefined &&
        updateData[field] !== user[field]
      ) {
        user[field] = updateData[field];
        updated = true;
      }
    });

    if (!updated) {
      return { error: "NO_CHANGES", message: "Nenhuma alteração foi feita" };
    }

    user.updatedAt = new Date();
    await user.save();

    console.log("✅ Perfil atualizado com sucesso");

    return { error: null, message: user };
  } catch (error) {
    console.error("❌ Service ERROR updateMyProfile:", error);
    return { error: "DATABASE_ERROR", message: "Erro ao atualizar usuário" };
  }
};

const updatePassword = async (userId, currentPassword, newPassword) => {
  try {
    console.log("🔐 Service updatePassword: Usuário ID:", userId);

    // Buscar usuário COM senha (para comparação)
    const user = await User.findOne({
      where: { id: userId },
      attributes: ["id", "email", "password"],
    });

    if (!user) {
      return { error: "NOT_FOUND", message: "Usuário não encontrado" };
    }

    console.log("🔑 Verificando senha atual...");

    // 1. VERIFICAR SENHA ATUAL
    const isPasswordValid = bcrypt.compareSync(currentPassword, user.password);

    if (!isPasswordValid) {
      console.log("❌ Senha atual incorreta");
      return { error: "INVALID_PASSWORD", message: "Senha atual incorreta" };
    }

    // 2. VALIDAR NOVA SENHA
    if (!newPassword || newPassword.length < 6) {
      return {
        error: "INVALID_NEW_PASSWORD",
        message: "A nova senha deve ter pelo menos 6 caracteres",
      };
    }

    // 3. VERIFICAR SE É DIFERENTE DA ATUAL
    const isSamePassword = bcrypt.compareSync(newPassword, user.password);
    if (isSamePassword) {
      return {
        error: "SAME_PASSWORD",
        message: "A nova senha não pode ser igual à atual",
      };
    }

    // 4. CRIAR HASH DA NOVA SENHA
    console.log("🔄 Gerando hash da nova senha...");
    const newPasswordHash = bcrypt.hashSync(newPassword, SALT_ROUNDS);

    // 5. ATUALIZAR NO BANCO
    user.password = newPasswordHash;
    user.updatedAt = new Date();
    await user.save();

    console.log("✅ Senha alterada com sucesso");

    return { error: null, message: "Senha alterada com sucesso" };
  } catch (error) {
    console.error("❌ Service ERROR updatePassword:", error);
    return { error: "DATABASE_ERROR", message: "Erro ao alterar senha" };
  }
};

// ============================================
// FUNÇÃO PARA LOGIN/AUTENTICAÇÃO
// ============================================

const verifyCredentials = async (email, password) => {
  try {
    console.log("🔑 Service verifyCredentials:", email);

    // Buscar usuário por email (com senha para comparação)
    const user = await User.findOne({
      where: { email },
      attributes: [
        "id",
        "email",
        "fullname",
        "password",
        "positionWork",
        "createdAt",
      ],
    });

    if (!user) {
      console.log("❌ Usuário não encontrado:", email);
      return { error: "USER_NOT_FOUND", message: "Email ou senha incorretos" };
    }

    console.log("🔑 Comparando senha...");

    // Comparar senha fornecida com hash no banco
    const isPasswordValid = bcrypt.compareSync(password, user.password);

    if (!isPasswordValid) {
      console.log("❌ Senha incorreta para:", email);
      return {
        error: "INVALID_PASSWORD",
        message: "Email ou senha incorretos",
      };
    }

    // Atualizar último login (opcional - se tiver campo)
    try {
      user.updatedAt = new Date();
      await user.save();
    } catch (updateError) {
      console.log(
        "⚠️ Não foi possível atualizar último login:",
        updateError.message
      );
    }

    // Remover senha do objeto de retorno
    const userWithoutPassword = user.toJSON();
    delete userWithoutPassword.password;

    // Formatar dados
    if (userWithoutPassword.createdAt) {
      userWithoutPassword.joinedDate = new Date(
        userWithoutPassword.createdAt
      ).toISOString();
    }

    console.log("✅ Login válido para:", email);

    return { error: null, message: userWithoutPassword };
  } catch (error) {
    console.error("❌ Service ERROR verifyCredentials:", error);
    return {
      error: "DATABASE_ERROR",
      message: "Erro ao verificar credenciais",
    };
  }
};

// ============================================
// FUNÇÃO PARA MIGRAR SENHAS EXISTENTES
// ============================================

const migrateExistingPasswords = async () => {
  try {
    console.log("🔄 Service migrateExistingPasswords: Iniciando...");

    const users = await User.findAll({
      attributes: ["id", "email", "password"],
    });

    let migratedCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        // Verificar se a senha NÃO é um hash bcrypt
        const isBcryptHash =
          user.password &&
          (user.password.startsWith("$2a$") ||
            user.password.startsWith("$2b$") ||
            user.password.startsWith("$2y$"));

        if (!isBcryptHash && user.password) {
          console.log(`🔐 Migrando usuário: ${user.email}`);

          // Gerar novo hash
          const hashedPassword = bcrypt.hashSync(user.password, SALT_ROUNDS);
          user.password = hashedPassword;
          await user.save();

          migratedCount++;
          console.log(`✅ ${user.email} migrado`);
        }
      } catch (userError) {
        console.error(`❌ Erro ao migrar ${user.email}:`, userError.message);
        errorCount++;
      }
    }

    console.log(
      `🎉 Migração concluída: ${migratedCount} migrados, ${errorCount} erros`
    );

    return {
      error: null,
      message: `Migração concluída: ${migratedCount} usuários migrados`,
    };
  } catch (error) {
    console.error("❌ Service ERROR migrateExistingPasswords:", error);
    return { error: "MIGRATION_ERROR", message: "Erro na migração de senhas" };
  }
};

const findUserForLogin = async (email) => {
  try {
    console.log("🔐 Service findUserForLogin: Buscando para login:", email);

    // Buscar usuário INCLUINDO a senha (apenas para verificação)
    const user = await User.findOne({
      where: { email },
      attributes: [
        "id",
        "email",
        "fullname",
        "password",
        "createdAt",
      ],
    });

    if (!user) {
      return { error: "USER_NOT_FOUND", message: "Usuário não encontrado" };
    }

    return { error: null, message: user };
  } catch (error) {
    console.error("❌ Service ERROR findUserForLogin:", error);
    return {
      error: "DATABASE_ERROR",
      message: "Erro ao buscar usuário para login",
    };
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
  // Função de migração
  migrateExistingPasswords,
};
