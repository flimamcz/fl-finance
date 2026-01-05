// src/app/services/User.service.js
const { User } = require("../../models");
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;

// ============================================
// FUNÇÕES PARA PERFIL REAL (COM BANCO DE DADOS)
// ============================================

const getMyProfile = async (userId) => {
  try {
    console.log('👤 Service getMyProfile: Buscando usuário ID:', userId);
    
    const user = await User.findOne({
      where: { id: userId },
      attributes: ['id', 'fullname', 'email', 'createdAt'] // Não retorna password!
    });

    if (!user) {
      return { error: "NOT_FOUND", message: "Usuário não encontrado" };
    }

    const userData = user.toJSON();
    
    // Formatar datas
    userData.joinedDate = userData.createdAt;
    
    console.log('✅ Perfil encontrado:', userData.email);
    return { error: null, message: userData };
    
  } catch (error) {
    console.error('❌ Service ERROR getMyProfile:', error);
    return { error: "DATABASE_ERROR", message: "Erro ao buscar usuário" };
  }
};

const updateMyProfile = async (userId, updateData) => {
  try {
    console.log('🔄 Service updateMyProfile: Usuário ID:', userId);
    console.log('📝 Dados para atualizar:', updateData);
    
    // Buscar usuário
    const user = await User.findOne({ 
      where: { id: userId }
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
    
    // Se quiser adicionar birthDate depois, precisa adicionar no modelo
    if (updateData.birthDate) {
      console.log('⚠️ Campo birthDate não existe no modelo. Ignorando.');
    }
    
    if (!updated) {
      return { error: "NO_CHANGES", message: "Nenhuma alteração foi feita" };
    }
    
    await user.save();
    
    console.log('✅ Perfil atualizado com sucesso');
    
    // Retornar dados atualizados (sem password)
    const userResponse = user.toJSON();
    delete userResponse.password;
    
    return { error: null, message: userResponse };
    
  } catch (error) {
    console.error('❌ Service ERROR updateMyProfile:', error);
    return { error: "DATABASE_ERROR", message: "Erro ao atualizar usuário" };
  }
};

const updatePassword = async (userId, currentPassword, newPassword) => {
  try {
    console.log('🔐 Service updatePassword: Usuário ID:', userId);
    
    // Buscar usuário COM senha (para comparação)
    const user = await User.findOne({ 
      where: { id: userId }
    });
    
    if (!user) {
      return { error: "NOT_FOUND", message: "Usuário não encontrado" };
    }
    
    console.log('🔑 Verificando senha atual...');
    
    // 1. VERIFICAR SENHA ATUAL
    const isPasswordValid = bcrypt.compareSync(currentPassword, user.password);
    
    if (!isPasswordValid) {
      console.log('❌ Senha atual incorreta');
      return { error: "INVALID_PASSWORD", message: "Senha atual incorreta" };
    }
    
    // 2. VALIDAR NOVA SENHA
    if (!newPassword || newPassword.length < 6) {
      return { error: "INVALID_NEW_PASSWORD", message: "A nova senha deve ter pelo menos 6 caracteres" };
    }
    
    // 3. VERIFICAR SE É DIFERENTE DA ATUAL
    const isSamePassword = bcrypt.compareSync(newPassword, user.password);
    if (isSamePassword) {
      return { error: "SAME_PASSWORD", message: "A nova senha não pode ser igual à atual" };
    }
    
    // 4. CRIAR HASH DA NOVA SENHA
    console.log('🔄 Gerando hash da nova senha...');
    const newPasswordHash = bcrypt.hashSync(newPassword, SALT_ROUNDS);
    
    // 5. ATUALIZAR NO BANCO
    user.password = newPasswordHash;
    await user.save();
    
    console.log('✅ Senha alterada com sucesso');
    
    return { error: null, message: "Senha alterada com sucesso" };
    
  } catch (error) {
    console.error('❌ Service ERROR updatePassword:', error);
    return { error: "DATABASE_ERROR", message: "Erro ao alterar senha" };
  }
};

// ============================================
// FUNÇÕES EXISTENTES (MANTENHA COMO ESTÃO)
// ============================================

const searchUsers = async () => {
  try {
    console.log('🔍 Service: Buscando todos os usuários');
    
    const users = await User.findAll({
      attributes: { exclude: ['password'] } // NUNCA retorna senha!
    });

    if (!users || users.length === 0) {
      return { error: "NOT_FOUND", message: "Nenhum usuário encontrado!" };
    }

    console.log(`✅ Encontrados ${users.length} usuários`);
    return { error: null, message: users };
    
  } catch (error) {
    console.error('❌ Service ERROR searchUsers:', error);
    return { error: "DATABASE_ERROR", message: "Erro ao buscar usuários" };
  }
};

const createUser = async (dataUser) => {
  try {
    console.log('🔐 Service createUser: Criando novo usuário');
    
    // Verificar se email já existe
    const findUserByEmail = await User.findOne({
      where: { email: dataUser.email },
    });

    if (findUserByEmail) {
      console.log('❌ Email já cadastrado:', dataUser.email);
      return { error: "EMAIL_EXISTS", message: "Email já cadastrado!" };
    }

    // Validar senha
    if (!dataUser.password || dataUser.password.length < 6) {
      return { error: "INVALID_PASSWORD", message: "A senha deve ter pelo menos 6 caracteres" };
    }

    // CRIAR HASH DA SENHA
    const hashedPassword = bcrypt.hashSync(dataUser.password, SALT_ROUNDS);
    
    const userDataWithHash = {
      fullname: dataUser.fullname,
      email: dataUser.email,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    console.log('✅ Senha criptografada com sucesso');

    // Criar usuário no banco
    const createUserRequest = await User.create(userDataWithHash);

    if (!createUserRequest) {
      return { error: "CREATE_ERROR", message: "Erro ao criar conta!" };
    }
    
    // Remove a senha do retorno (segurança)
    const userWithoutPassword = createUserRequest.toJSON();
    delete userWithoutPassword.password;
    
    console.log('✅ Usuário criado com sucesso:', userWithoutPassword.email);
    
    return { error: null, message: userWithoutPassword };
    
  } catch (error) {
    console.error('❌ Service ERROR createUser:', error);
    return { error: "DATABASE_ERROR", message: "Erro ao criar usuário" };
  }
};

const findUserForLogin = async (email) => {
  try {
    console.log('🔐 Service findUserForLogin: Buscando para login:', email);
    
    const user = await User.findOne({
      where: { email }
    });

    if (!user) {
      return { error: "USER_NOT_FOUND", message: "Usuário não encontrado" };
    }

    return { error: null, message: user };
    
  } catch (error) {
    console.error('❌ Service ERROR findUserForLogin:', error);
    return { error: "DATABASE_ERROR", message: "Erro ao buscar usuário para login" };
  }
};

const verifyCredentials = async (email, password) => {
  try {
    console.log('🔑 Service verifyCredentials:', email);
    
    const user = await User.findOne({
      where: { email }
    });
    
    if (!user) {
      return { error: "USER_NOT_FOUND", message: "Email ou senha incorretos" };
    }
    
    const isPasswordValid = bcrypt.compareSync(password, user.password);
    
    if (!isPasswordValid) {
      return { error: "INVALID_PASSWORD", message: "Email ou senha incorretos" };
    }
    
    // Remover senha do objeto de retorno
    const userWithoutPassword = user.toJSON();
    delete userWithoutPassword.password;
    
    return { error: null, message: userWithoutPassword };
    
  } catch (error) {
    console.error('❌ Service ERROR verifyCredentials:', error);
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
  findUserForLogin
};