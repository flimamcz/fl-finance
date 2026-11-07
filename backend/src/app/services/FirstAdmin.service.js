"use strict";

const bcrypt = require("bcryptjs");
const { Op } = require("sequelize");
const { sequelize, SystemSetting, User } = require("../../models");

const createFirstAdmin = async ({ fullname, username, email, password }) => {
  const cleanFullname = typeof fullname === "string" ? fullname.trim() : "";
  const cleanUsername = typeof username === "string" ? username.trim().toLowerCase() : "";
  const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

  if (cleanFullname.length < 2 || cleanFullname.length > 100) return { error: "INVALID_FULLNAME" };
  if (!/^[a-z0-9._-]{3,30}$/.test(cleanUsername)) return { error: "INVALID_USERNAME" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return { error: "INVALID_EMAIL" };
  if (typeof password !== "string" || password.length < 12 || Buffer.byteLength(password, "utf8") > 72) {
    return { error: "INVALID_PASSWORD" };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const transaction = await sequelize.transaction();
  try {
    const setting = await SystemSetting.findByPk(1, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!setting) return { error: "SETUP_UNAVAILABLE" };
    if (setting.adminSetupComplete) return { error: "SETUP_COMPLETE" };

    const existingAdmins = await User.count({
      where: { isAdmin: true },
      transaction,
    });
    if (existingAdmins > 0) return { error: "ADMIN_EXISTS" };

    const duplicate = await User.findOne({
      where: { [Op.or]: [{ email: cleanEmail }, { username: cleanUsername }] },
      attributes: ["id"],
      transaction,
    });
    if (duplicate) return { error: "ACCOUNT_EXISTS" };

    await User.create(
      {
        fullname: cleanFullname,
        username: cleanUsername,
        email: cleanEmail,
        password: passwordHash,
        isAdmin: true,
        isBlocked: false,
      },
      { transaction }
    );

    const [claimed] = await SystemSetting.update(
      { adminSetupComplete: true },
      {
        where: { id: 1, adminSetupComplete: false },
        transaction,
      }
    );
    if (!claimed) return { error: "SETUP_COMPLETE" };

    await transaction.commit();
    return { error: null };
  } catch (error) {
    await transaction.rollback();
    throw error;
  } finally {
    if (!transaction.finished) await transaction.rollback();
  }
};

module.exports = { createFirstAdmin };
