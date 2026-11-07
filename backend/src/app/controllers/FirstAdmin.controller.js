"use strict";

const crypto = require("crypto");
const { createFirstAdmin } = require("../services/FirstAdmin.service");

const matchesBootstrapToken = (providedToken, configuredToken) => {
  if (typeof providedToken !== "string" || !configuredToken || configuredToken.length < 32) {
    return false;
  }
  const providedHash = crypto.createHash("sha256").update(providedToken).digest();
  const configuredHash = crypto.createHash("sha256").update(configuredToken).digest();
  return crypto.timingSafeEqual(providedHash, configuredHash);
};

const create = async (req, res) => {
  res.set("Cache-Control", "no-store");
  if (!matchesBootstrapToken(req.get("X-Admin-Bootstrap-Token"), process.env.ADMIN_BOOTSTRAP_TOKEN)) {
    return res.status(process.env.ADMIN_BOOTSTRAP_TOKEN ? 403 : 404).json({
      error: true,
      message: "Configuração inicial indisponível.",
    });
  }

  try {
    const result = await createFirstAdmin(req.body || {});
    if (result.error) {
      const messages = {
        INVALID_FULLNAME: "Informe um nome com até 100 caracteres.",
        INVALID_USERNAME: "O usuário deve ter de 3 a 30 letras, números, pontos, hífens ou sublinhados.",
        INVALID_EMAIL: "Informe um email válido.",
        INVALID_PASSWORD: "Use uma senha de 12 a 72 bytes.",
        SETUP_UNAVAILABLE: "A configuração inicial não está disponível. Confirme se as migrações foram aplicadas.",
        SETUP_COMPLETE: "A configuração inicial já foi concluída.",
        ADMIN_EXISTS: "Já existe um administrador cadastrado.",
        ACCOUNT_EXISTS: "Esse usuário ou email já está em uso.",
      };
      return res.status(result.error.startsWith("INVALID_") ? 400 : 409).json({
        error: true,
        message: messages[result.error],
      });
    }

    return res.status(201).json({
      error: false,
      message: "Administrador inicial criado. Entre pela página de login.",
    });
  } catch (error) {
    console.error("First administrator creation failed:", error.name);
    return res.status(500).json({
      error: true,
      message: "Não foi possível concluir a configuração inicial.",
    });
  }
};

module.exports = { create, matchesBootstrapToken };
