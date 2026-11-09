"use strict";

const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { Op } = require("sequelize");
const { User, sequelize } = require("../../models");

const RECOVERY_CODE_LIFETIME_MS = 30 * 60 * 1000;
const RECOVERY_CODE_SALT_ROUNDS = 10;

const toAdminListUser = (user, adminId) => ({
  id: user.id,
  fullname: user.fullname,
  username: user.username,
  email: user.email,
  isAdmin: Boolean(user.isAdmin),
  isBlocked: Boolean(user.isBlocked),
  isArchived: Boolean(user.deletedAt),
  isCurrentUser: Number(user.id) === Number(adminId),
  createdAt: user.createdAt,
  archivedAt: user.deletedAt || null,
});

const listUsers = async ({ adminId, query, status, page, pageSize }) => {
  const where = {};
  if (status === "active") where.isBlocked = false;
  if (status === "blocked") where.isBlocked = true;
  if (status === "archived") where.deletedAt = { [Op.not]: null };
  if (query) {
    where[Op.or] = [
      { fullname: { [Op.like]: `%${query}%` } },
      { username: { [Op.like]: `%${query}%` } },
      { email: { [Op.like]: `%${query}%` } },
    ];
  }

  const [users, total, activeUsers, blockedUsers, archived, admins] = await Promise.all([
    User.findAll({
      where,
      paranoid: status !== "archived",
      attributes: ["id", "fullname", "username", "email", "isAdmin", "isBlocked", "createdAt", "deletedAt"],
      order: [["createdAt", "DESC"], ["id", "DESC"]],
      limit: pageSize,
      offset: (page - 1) * pageSize,
    }),
    User.count({ where, paranoid: status !== "archived" }),
    User.count({ where: { isBlocked: false } }),
    User.count({ where: { isBlocked: true } }),
    User.count({ where: { deletedAt: { [Op.not]: null } }, paranoid: false }),
    User.count({ where: { isAdmin: true, isBlocked: false } }),
  ]);

  return {
    users: users.map((user) => toAdminListUser(user, adminId)),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    summary: {
      total: activeUsers + blockedUsers,
      active: activeUsers,
      blocked: blockedUsers,
      archived,
      admins,
    },
  };
};

const setUserBlocked = async (adminId, targetId, blocked) => {
  if (blocked && Number(adminId) === Number(targetId)) {
    return { error: "SELF_BLOCK", message: "Não é possível bloquear a própria conta." };
  }

  return sequelize.transaction(async (transaction) => {
    const user = await User.findByPk(targetId, {
      attributes: ["id", "fullname", "username", "email", "isAdmin", "isBlocked", "sessionVersion", "createdAt"],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!user) return { error: "NOT_FOUND", message: "Usuário não encontrado." };

    if (blocked && user.isAdmin && !user.isBlocked) {
      const activeAdmins = await User.findAll({
        where: { isAdmin: true, isBlocked: false },
        attributes: ["id"],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (activeAdmins.length <= 1) {
        return { error: "LAST_ADMIN", message: "Não é possível bloquear o último administrador ativo." };
      }
    }

    if (Boolean(user.isBlocked) !== blocked) {
      user.isBlocked = blocked;
      user.sessionVersion = (Number(user.sessionVersion) || 0) + 1;
      await user.save({ transaction, fields: ["isBlocked", "sessionVersion"] });
    }

    return { user: toAdminListUser(user, adminId) };
  });
};

const generateRecoveryCode = async (adminId, targetId) => {
  if (Number(adminId) === Number(targetId)) {
    return { error: "SELF_RESET", message: "Para redefinir seu próprio acesso, use a recuperação de senha." };
  }

  const user = await User.findByPk(targetId, {
    attributes: ["id", "fullname", "username", "email", "isAdmin", "isBlocked", "sessionVersion", "createdAt"],
  });
  if (!user) return { error: "NOT_FOUND", message: "Usuário não encontrado." };

  const recoveryCode = String(crypto.randomInt(100000, 1000000));
  const expiresAt = new Date(Date.now() + RECOVERY_CODE_LIFETIME_MS);
  user.sessionVersion = (Number(user.sessionVersion) || 0) + 1;
  user.resetCodeHash = await bcrypt.hash(recoveryCode, RECOVERY_CODE_SALT_ROUNDS);
  user.resetCodeHint = `${recoveryCode.slice(0, 2)}***${recoveryCode.slice(-1)}`;
  user.resetCodeExpiresAt = expiresAt;
  await user.save({ fields: ["resetCodeHash", "resetCodeHint", "resetCodeExpiresAt", "sessionVersion"] });

  return { user: toAdminListUser(user, adminId), recoveryCode, expiresAt };
};

const archiveUser = async (adminId, targetId) => {
  if (Number(adminId) === Number(targetId)) {
    return { error: "SELF_ARCHIVE", message: "Não é possível arquivar a própria conta." };
  }

  return sequelize.transaction(async (transaction) => {
    const user = await User.findByPk(targetId, {
      attributes: ["id", "fullname", "username", "email", "isAdmin", "isBlocked", "sessionVersion", "createdAt"],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!user) return { error: "NOT_FOUND", message: "Usuário não encontrado." };

    if (user.isAdmin && !user.isBlocked) {
      const activeAdmins = await User.findAll({
        where: { isAdmin: true, isBlocked: false },
        attributes: ["id"],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (activeAdmins.length <= 1) {
        return { error: "LAST_ADMIN", message: "Não é possível arquivar o último administrador ativo." };
      }
    }

    user.sessionVersion = (Number(user.sessionVersion) || 0) + 1;
    await user.save({ transaction, fields: ["sessionVersion"] });
    await user.destroy({ transaction });
    return { user: toAdminListUser(user, adminId) };
  });
};

const restoreUser = async (adminId, targetId) => {
  return sequelize.transaction(async (transaction) => {
    const user = await User.findByPk(targetId, {
      paranoid: false,
      attributes: ["id", "fullname", "username", "email", "isAdmin", "isBlocked", "sessionVersion", "createdAt", "deletedAt"],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!user || !user.deletedAt) {
      return { error: "NOT_ARCHIVED", message: "A conta não está arquivada." };
    }

    user.sessionVersion = (Number(user.sessionVersion) || 0) + 1;
    await user.save({ transaction, fields: ["sessionVersion"] });
    await user.restore({ transaction });
    return { user: toAdminListUser(user, adminId) };
  });
};

const editUser = async (adminId, targetId, changes) => {
  if (Number(adminId) === Number(targetId)) {
    return { error: "SELF_EDIT", message: "Não é possível editar a própria conta pelo painel administrativo." };
  }

  const fullname = typeof changes?.fullname === "string" ? changes.fullname.trim() : "";
  const username = typeof changes?.username === "string" ? changes.username.trim().toLowerCase() : "";
  const email = typeof changes?.email === "string" ? changes.email.trim().toLowerCase() : "";
  if (fullname.length < 2 || fullname.length > 100
    || username.length < 3 || username.length > 30 || !/^[a-z0-9._-]+$/.test(username)
    || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    || typeof changes?.isAdmin !== "boolean") {
    return { error: "INVALID_INPUT", message: "Os dados informados são inválidos." };
  }

  try {
    return await sequelize.transaction(async (transaction) => {
      const user = await User.findByPk(targetId, {
        paranoid: false,
        attributes: ["id", "fullname", "username", "email", "isAdmin", "isBlocked", "sessionVersion", "createdAt", "deletedAt"],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!user) return { error: "NOT_FOUND", message: "Usuário não encontrado." };
      if (user.deletedAt) return { error: "ARCHIVED", message: "Contas arquivadas não podem ser editadas." };

      const duplicate = await User.findOne({
        where: {
          id: { [Op.ne]: targetId },
          [Op.or]: [{ username }, { email }],
        },
        paranoid: false,
        attributes: ["id"],
        transaction,
      });
      if (duplicate) return { error: "DUPLICATE", message: "Este usuário ou email já está em uso." };

      const updatedProfile = user.fullname !== fullname
        || user.username !== username
        || user.email !== email;
      const roleChanged = Boolean(user.isAdmin) !== changes.isAdmin;

      if (roleChanged) {
        const actor = await User.findByPk(adminId, {
          attributes: ["id", "password", "isAdmin", "isBlocked"],
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        if (!actor || !actor.isAdmin || actor.isBlocked) {
          return { error: "NOT_AUTHORIZED", message: "Seu acesso administrativo não está mais ativo." };
        }
        if (typeof changes.currentPassword !== "string" || !changes.currentPassword
          || !await bcrypt.compare(changes.currentPassword, actor.password)) {
          return { error: "REAUTH_REQUIRED", message: "Informe sua senha atual para alterar a função administrativa." };
        }
      }

      if (roleChanged && user.isAdmin && !changes.isAdmin && !user.isBlocked) {
        const activeAdmins = await User.findAll({
          where: { isAdmin: true, isBlocked: false },
          attributes: ["id"],
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        if (activeAdmins.length <= 1) {
          return { error: "LAST_ADMIN", message: "Não é possível remover o último administrador ativo." };
        }
      }

      if (updatedProfile || roleChanged) {
        user.fullname = fullname;
        user.username = username;
        user.email = email;
        user.isAdmin = changes.isAdmin;
        user.sessionVersion = (Number(user.sessionVersion) || 0) + 1;
        await user.save({
          transaction,
          fields: ["fullname", "username", "email", "isAdmin", "sessionVersion"],
        });
      }

      return { user: toAdminListUser(user, adminId) };
    });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      return { error: "DUPLICATE", message: "Este usuário ou email já está em uso." };
    }
    throw error;
  }
};

module.exports = {
  archiveUser,
  editUser,
  generateRecoveryCode,
  listUsers,
  restoreUser,
  setUserBlocked,
};
