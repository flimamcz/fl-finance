"use strict";

const path = require("path");
const readline = require("readline");
const dotenv = require("dotenv");

const backendDirectory = path.resolve(__dirname, "..");
dotenv.config({ path: path.resolve(backendDirectory, "..", ".env") });

const requiredVariables = [
  "MYSQL_HOST",
  "MYSQL_USER",
  "MYSQL_PASSWORD",
  "MYSQL_DATABASE",
];
const missingVariables = requiredVariables.filter((name) => !process.env[name]);
if (missingVariables.length) {
  console.error(`Missing required database configuration: ${missingVariables.join(", ")}`);
  process.exit(1);
}

const { sequelize, SystemSetting, User } = require("../src/models");
const bcrypt = require("bcryptjs");
const { Op } = require("sequelize");

const ask = (label, { hidden = false } = {}) => new Promise((resolve, reject) => {
  const input = process.stdin;
  if (!input.isTTY || typeof input.setRawMode !== "function") {
    reject(new Error("INTERACTIVE_TERMINAL_REQUIRED"));
    return;
  }

  readline.emitKeypressEvents(input);
  input.setRawMode(true);
  input.resume();
  process.stdout.write(label);
  let value = "";

  const restoreTerminal = () => {
    input.removeListener("keypress", onKeypress);
    input.setRawMode(false);
    process.stdout.write("\n");
  };
  const onKeypress = (sequence, key = {}) => {
    if (key.ctrl && key.name === "c") {
      restoreTerminal();
      reject(new Error("CANCELLED"));
      return;
    }
    if (key.name === "return" || key.name === "enter") {
      restoreTerminal();
      resolve(value);
      return;
    }
    if (key.name === "backspace") {
      if (value) {
        value = Array.from(value).slice(0, -1).join("");
        if (!hidden) process.stdout.write("\b \b");
      }
      return;
    }
    if (sequence && !key.ctrl && !key.meta && /^[\x20-\uFFFF]+$/u.test(sequence)) {
      value += sequence;
      if (!hidden) process.stdout.write(sequence);
    }
  };

  input.on("keypress", onKeypress);
});

const fail = (code) => {
  const error = new Error(code);
  error.code = code;
  throw error;
};

async function bootstrapAdmin() {
  let transaction;
  try {
    const username = (await ask("Usuário do administrador: ")).trim().toLowerCase();
    const email = (await ask("Email do administrador: ")).trim().toLowerCase();
    const password = await ask("Nova senha (entrada oculta): ", { hidden: true });
    const confirmation = await ask("Confirme a senha (entrada oculta): ", { hidden: true });

    if (!/^[a-z0-9._-]{3,30}$/.test(username)) {
      fail("INVALID_USERNAME");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      fail("INVALID_EMAIL");
    }
    if (password.length < 12) {
      fail("WEAK_PASSWORD");
    }
    if (password !== confirmation) {
      fail("PASSWORD_MISMATCH");
    }

    const passwordHash = await bcrypt.hash(password, 10);
    transaction = await sequelize.transaction();
    const setting = await SystemSetting.findByPk(1, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!setting) fail("SETUP_SETTING_MISSING");
    if (setting.adminSetupComplete) fail("SETUP_ALREADY_COMPLETE");

    const existingAdmins = await User.count({
      where: { isAdmin: true },
      transaction,
    });
    if (existingAdmins > 0) fail("ADMIN_ALREADY_EXISTS");

    const duplicate = await User.findOne({
      where: { [Op.or]: [{ email }, { username }] },
      attributes: ["id"],
      transaction,
    });
    if (duplicate) fail("ACCOUNT_ALREADY_EXISTS");

    await User.create(
      {
        fullname: username,
        username,
        email,
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
    if (!claimed) fail("SETUP_ALREADY_COMPLETE");

    await transaction.commit();
    transaction = null;
    console.info("Administrador inicial criado. Entre na aplicação para gerenciar usuários.");
  } catch (error) {
    if (transaction) await transaction.rollback();
    const messages = {
      INTERACTIVE_TERMINAL_REQUIRED: "Execute este comando em um terminal interativo.",
      CANCELLED: "Configuração cancelada.",
      INVALID_USERNAME: "O usuário deve ter de 3 a 30 letras, números, pontos, hífens ou sublinhados.",
      INVALID_EMAIL: "Informe um email válido.",
      WEAK_PASSWORD: "Escolha uma senha com pelo menos 12 caracteres.",
      PASSWORD_MISMATCH: "As senhas não coincidem.",
      SETUP_SETTING_MISSING: "Registro de configuração ausente; execute as migrações primeiro.",
      SETUP_ALREADY_COMPLETE: "A configuração inicial já foi concluída; nenhuma alteração feita.",
      ADMIN_ALREADY_EXISTS: "Já existe um administrador; nenhuma alteração feita.",
      ACCOUNT_ALREADY_EXISTS: "Esse usuário ou email já está em uso; nenhuma alteração feita.",
    };
    console.error(messages[error.code] || `Administrator bootstrap failed (${error.name || "Error"}).`);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

bootstrapAdmin();
