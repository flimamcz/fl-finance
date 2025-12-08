// src/app/services/Auth.service.js
const jwt = require('jsonwebtoken');
// const bcrypt = require('bcrypt');
const bcrypt = require('bcryptjs');
const UserService = require('./User.service');

class AuthService {
  // CORRETO: recebe email e password como parâmetros
  async login(email, password) {
    try {
      console.log(`🔐 Tentando login: ${email}`);
      
      // 1. Buscar todos usuários
      const { error: userError, message: users } = await UserService.searchUsers();
      
      if (userError) {
        return { error: true, message: "Erro ao buscar usuários" };
      }

      if (!users) {
        return { error: true, message: "Nenhum usuário cadastrado" };
      }

      // 2. Encontrar usuário pelo email
      let user = null;
      
      if (Array.isArray(users)) {
        user = users.find(u => u.email === email);
      } else if (users.email === email) {
        user = users;
      }

      if (!user) {
        return { error: true, message: "Usuário não encontrado" };
      }

      // 3. Verificar senha
      console.log(`🔑 Senha no DB: ${user.password}, Senha fornecida: ${password}`);
      
      // Se senha estiver criptografada com bcrypt:
      // const isValid = await bcrypt.compare(password, user.password);
      
      // Temporário: comparação direta (substitua depois)
      const isValidPassword = (user.password === password);
      
      if (!isValidPassword) {
        return { error: true, message: "Senha incorreta" };
      }

      // 4. Gerar JWT Token
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          name: user.fullname || user.name
        },
        process.env.JWT_SECRET || 'fl_financas_secret_key_2024',
        { expiresIn: '24h' }
      );

      // 5. Retornar resposta
      return {
        error: false,
        message: {
          user: {
            id: user.id,
            name: user.fullname || user.name,
            email: user.email,
            user_pf: user.user_pf,
            positionWork: user.positionWork,
            createdAt: user.createdAt
          },
          token
        }
      };
      
    } catch (error) {
      console.error('❌ AuthService login error:', error);
      return { error: true, message: 'Erro interno no servidor' };
    }
  }

  async register(userData) {
    try {
      console.log('📝 Registrando usuário:', userData.email);
      
      // 1. Verificar se email já existe
      const { error: userError, message: users } = await UserService.searchUsers();
      
      if (!userError && users) {
        const existingUser = Array.isArray(users) 
          ? users.find(u => u.email === userData.email)
          : (users.email === userData.email ? users : null);
        
        if (existingUser) {
          return { error: true, message: "Email já cadastrado" };
        }
      }

      // 2. Criptografar senha
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      // 3. Chamar UserService para criar usuário
      // Você precisa adaptar conforme seu UserService.createUser()
      const { error, message } = await UserService.createUser({
        ...userData,
        password: hashedPassword
      });

      if (error) {
        return { error: true, message };
      }

      // 4. Gerar token para login automático
      const token = jwt.sign(
        {
          id: message.id,
          email: message.email,
          name: message.fullname || message.name
        },
        process.env.JWT_SECRET || 'fl_financas_secret_key_2024',
        { expiresIn: '24h' }
      );

      return {
        error: false,
        message: {
          user: {
            id: message.id,
            name: message.fullname || message.name,
            email: message.email,
            createdAt: message.createdAt
          },
          token
        }
      };
      
    } catch (error) {
      console.error('❌ AuthService register error:', error);
      return { error: true, message: 'Erro ao registrar usuário' };
    }
  }

  async verifyToken(token) {
    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'fl_financas_secret_key_2024'
      );
      return { error: false, message: decoded };
    } catch (error) {
      console.error('❌ Token verification failed:', error.message);
      return { error: true, message: 'Token inválido ou expirado' };
    }
  }
}

module.exports = new AuthService();