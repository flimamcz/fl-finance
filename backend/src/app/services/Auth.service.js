// src/app/services/Auth.service.js
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { User, SystemSetting, sequelize } = require("../../models");
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

  async getSetupStatus() {
    const setting = await SystemSetting.findByPk(1);
    if (!setting) throw new Error("Configuração inicial do sistema ausente");
    const users = await User.findAll({
      attributes: ["username"],
      raw: true,
    });
    const hasExistingAccounts = users.some(
      ({ username }) => !/^legacy_\d+$/.test(username)
    );
    return {
      setupRequired: !setting.adminSetupComplete,
      existingUsers: hasExistingAccounts,
    };
  }

  async setupAdmin({ username, email, password }) {
    const normalizedUsername = String(username || "").trim().toLowerCase();
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!/^[a-z0-9._-]{3,30}$/.test(normalizedUsername)) {
      return { error: true, message: "O usuário deve ter entre 3 e 30 caracteres (letras, números, ponto, hífen ou sublinhado)" };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return { error: true, message: "Informe um email válido" };
    }
    if (typeof password !== "string" || password.length < 6) {
      return { error: true, message: "A senha deve ter pelo menos 6 caracteres" };
    }

    try {
      return await sequelize.transaction(async (transaction) => {
        const setting = await SystemSetting.findByPk(1, { transaction });
        if (!setting || setting.adminSetupComplete) {
          return { error: true, message: "A configuração inicial já foi concluída" };
        }
        const users = await User.findAll({
          attributes: ["id", "username"],
          transaction,
          raw: true,
        });
        const existingUsers = users.some(
          ({ username }) => !/^legacy_\d+$/.test(username)
        );
        let user = null;
        if (existingUsers) {
          user = await User.findOne({
            where: { email: normalizedEmail },
            transaction,
            lock: transaction.LOCK.UPDATE,
          });
          if (!user || !await bcrypt.compare(password, user.password)) {
            return {
              error: true,
              message: "Email ou senha da conta existente incorretos",
            };
          }

          const usernameInUse = await User.findOne({
            where: { username: normalizedUsername },
            transaction,
          });
          if (usernameInUse && usernameInUse.id !== user.id) {
            return { error: true, message: "Este usuário já está em uso" };
          }
        } else if (password.length < 8) {
          return {
            error: true,
            message: "A senha deve ter pelo menos 8 caracteres",
          };
        }

        const recoveryCode = String(crypto.randomInt(100000, 1000000));
        const [recoveryCodeHash, passwordHash] = await Promise.all([
          bcrypt.hash(recoveryCode, 10),
          bcrypt.hash(password, 10),
        ]);
        const [claimed] = await SystemSetting.update(
          { adminSetupComplete: true },
          {
            where: { id: 1, adminSetupComplete: false },
            transaction,
          }
        );
        if (!claimed) {
          return { error: true, message: "A configuração inicial já foi concluída" };
        }

        if (user) {
          user.username = normalizedUsername;
          user.isAdmin = true;
          user.sessionVersion = (Number(user.sessionVersion) || 0) + 1;
          user.resetCodeHash = recoveryCodeHash;
          user.resetCodeHint = `${recoveryCode.slice(0, 2)}***${recoveryCode.slice(-1)}`;
          user.resetCodeExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
          await user.save({ transaction });
        } else {
          user = await User.create(
            {
              fullname: normalizedUsername,
              username: normalizedUsername,
              email: normalizedEmail,
              password: passwordHash,
              isAdmin: true,
              resetCodeHash: recoveryCodeHash,
              resetCodeHint: `${recoveryCode.slice(0, 2)}***${recoveryCode.slice(-1)}`,
              resetCodeExpiresAt: new Date(Date.now() + 30 * 60 * 1000),
            },
            { transaction }
          );
        }

        return {
          error: false,
          message: {
            user: publicUser(user),
            token: makeToken(user),
            recoveryCode,
          },
        };
      });
    } catch (error) {
      console.error("Initial account setup failed:", error.name);
      return { error: true, message: "Não foi possível concluir a configuração inicial" };
    }
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
