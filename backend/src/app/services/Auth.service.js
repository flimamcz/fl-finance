// src/app/services/Auth.service.js
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { User, SystemSetting } = require("../../models");
const UserService = require("./User.service");
const SESSION_LIFETIME = "8h";
const TOKEN_VERSION = 3;

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET must be configured before authentication is available");
  }
  return process.env.JWT_SECRET;
};

const makeToken = (user) =>
  jwt.sign(
    {
      id: user.id,
      isAdmin: Boolean(user.isAdmin),
      ver: TOKEN_VERSION,
      sv: Number(user.sessionVersion) || 0,
    },
    getJwtSecret(),
    { expiresIn: SESSION_LIFETIME }
  );

const publicUser = () => ({ authenticated: true });

class AuthService {
  async login(identifier, password) {
    try {
      const { error: userError, message: user } =
        await UserService.findUserForLogin(identifier);

      if (userError === "USER_NOT_FOUND") {
        return { error: true, message: "Usuário/email ou senha incorretos" };
      }

      if (userError) {
        return { error: true, message: "Erro ao buscar usuário" };
      }

      if (!user) {
        return { error: true, message: "Usuário não encontrado" };
      }

      if (!user.password) {
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
        return { error: true, message: "Erro no sistema. Senha não segura." };
      }

      const isValidPassword = await bcrypt.compare(password, user.password);

      if (!isValidPassword) {
        return { error: true, message: "Usuário/email ou senha incorretos" };
      }

      if (user.isBlocked) {
        return { error: true, blocked: true, message: "Esta conta está bloqueada. Entre em contato com o suporte." };
      }

      return {
        error: false,
        message: {
          user: publicUser(user),
          token: makeToken(user),
        },
      };
    } catch (error) {
      console.error("Authentication failed:", error.name);
      return { error: true, message: "Erro interno no servidor" };
    }
  }

  async resetPassword(email, code, newPassword) {
    return UserService.resetPassword(email, code, newPassword);
  }

  async register(userData) {
    try {
      const setting = await SystemSetting.findByPk(1);
      if (!setting || !setting.adminSetupComplete) {
        return { error: true, message: "Conclua primeiro a configuração inicial do administrador" };
      }

      const { error, message } = await UserService.createUser(userData);

      if (error) {
        return { error: true, message };
      }

      return {
        error: false,
        message: {
          user: publicUser(message),
          recoveryCode: message.recoveryCode,
        },
      };
    } catch (error) {
      console.error("Registration failed:", error.name);
      return { error: true, message: "Erro ao registrar usuário" };
    }
  }

  async verifyToken(token) {
    try {
      const decoded = jwt.verify(
        token,
        getJwtSecret(),
        { maxAge: SESSION_LIFETIME }
      );
      if (decoded.ver !== TOKEN_VERSION) {
        return { error: true, message: "Token version is no longer supported" };
      }
      const user = await User.findByPk(decoded.id, {
        attributes: ["id", "isAdmin", "isBlocked", "sessionVersion"],
      });
      if (!user || user.isBlocked || decoded.sv !== Number(user.sessionVersion)) {
        return { error: true, message: "Account is unavailable" };
      }
      return {
        error: false,
        message: { id: user.id, isAdmin: Boolean(user.isAdmin) },
      };
    } catch (error) {
      console.error("Session token verification failed:", error.name);
      return { error: true, message: "Token inválido ou expirado" };
    }
  }
}

module.exports = new AuthService();
