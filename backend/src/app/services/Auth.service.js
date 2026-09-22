// src/app/services/Auth.service.js
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const UserService = require("./User.service");

class AuthService {
  async login(email, password) {
    try {
      console.log(`🔐 Tentando login: ${email}`);

      // ✅ CORREÇÃO: Use a NOVA função que retorna a senha
      const { error: userError, message: user } =
        await UserService.findUserForLogin(email);

      if (userError === "USER_NOT_FOUND") {
        return { error: true, message: "Email ou senha incorretos" };
      }

      if (userError) {
        return { error: true, message: "Erro ao buscar usuário" };
      }

      if (!user) {
        return { error: true, message: "Usuário não encontrado" };
      }

      console.log(`🔑 Usuário encontrado: ${user.email}`);

      // ✅ VERIFICAR SE A SENHA EXISTE
      if (!user.password) {
        console.error("❌ ERRO CRÍTICO: Usuário sem senha no banco!");
        return {
          error: true,
          message: "Erro no sistema. Contate o administrador.",
        };
      }

      // ✅ VERIFICAR SE É HASH VÁLIDO
      const isBcryptHash =
        user.password &&
        (user.password.startsWith("$2a$") ||
          user.password.startsWith("$2b$") ||
          user.password.startsWith("$2y$"));

      if (!isBcryptHash) {
        console.error("❌ ERRO: Senha não está criptografada!");
        console.error("Senha no banco:", user.password);
        return { error: true, message: "Erro no sistema. Senha não segura." };
      }

      // ✅ COMPARAR SENHA COM BCRYPT
      console.log("🔑 Comparando senha com bcrypt...");
      const isValidPassword = bcrypt.compareSync(password, user.password);

      if (!isValidPassword) {
        console.log("❌ Senha incorreta");
        return { error: true, message: "Email ou senha incorretos" };
      }

      console.log("✅ Login válido!");

      // Gerar JWT Token
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          name: user.fullname || user.name,
        },
        process.env.JWT_SECRET || "fl_financas_secret_key_2024",
        { expiresIn: "24h" }
      );

      // Retornar resposta (SEM A SENHA!)
      return {
        error: false,
        message: {
          user: {
            id: user.id,
            name: user.fullname || user.name,
            email: user.email,
            user_pf: user.user_pf,
            positionWork: user.positionWork,
            createdAt: user.createdAt,
          },
          token,
        },
      };
    } catch (error) {
      console.error("❌ AuthService login error:", error);
      console.error("❌ Stack:", error.stack);
      return { error: true, message: "Erro interno no servidor" };
    }
  }

  async register(userData) {
    try {
      console.log("📝 Registrando usuário:", userData.email);

      // 1. Verificar se email já existe
      const { error: userError, message: users } =
        await UserService.searchUsers();

      if (!userError && users) {
        const existingUser = Array.isArray(users)
          ? users.find((u) => u.email === userData.email)
          : users.email === userData.email
          ? users
          : null;

        if (existingUser) {
          return { error: true, message: "Email já cadastrado" };
        }
      }

      // UserService.createUser já gera o hash da senha uma única vez.
      const { error, message } = await UserService.createUser(userData);

      if (error) {
        return { error: true, message };
      }

      // 4. Gerar token para login automático
      const token = jwt.sign(
        {
          id: message.id,
          email: message.email,
          name: message.fullname || message.name,
        },
        process.env.JWT_SECRET || "fl_financas_secret_key_2024",
        { expiresIn: "24h" }
      );

      return {
        error: false,
        message: {
          user: {
            id: message.id,
            name: message.fullname || message.name,
            email: message.email,
            createdAt: message.createdAt,
          },
          token,
        },
      };
    } catch (error) {
      console.error("❌ AuthService register error:", error);
      return { error: true, message: "Erro ao registrar usuário" };
    }
  }

  async verifyToken(token) {
    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "fl_financas_secret_key_2024"
      );
      return { error: false, message: decoded };
    } catch (error) {
      console.error("❌ Token verification failed:", error.message);
      return { error: true, message: "Token inválido ou expirado" };
    }
  }
}

module.exports = new AuthService();
