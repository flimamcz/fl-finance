"use strict";

const adminService = require("../services/Admin.service");

const listUsers = async (req, res) => {
  try {
    const rawPage = Number(req.query.page || 1);
    const rawPageSize = Number(req.query.pageSize || 20);
    const query = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const status = typeof req.query.status === "string" ? req.query.status : "all";

    if (!Number.isInteger(rawPage) || rawPage < 1
      || !Number.isInteger(rawPageSize) || rawPageSize < 1 || rawPageSize > 100
      || query.length > 100
      || !["all", "active", "blocked"].includes(status)) {
      return res.status(400).json({ error: true, message: "Filtros inválidos." });
    }

    return res.status(200).json({
      error: false,
      ...await adminService.listUsers({
        adminId: req.user.id,
        query,
        status,
        page: rawPage,
        pageSize: rawPageSize,
      }),
    });
  } catch (error) {
    console.error("Admin user listing failed:", error.name);
    return res.status(500).json({ error: true, message: "Não foi possível carregar os usuários." });
  }
};

const setUserBlocked = (blocked) => async (req, res) => {
  const targetId = Number(req.params.id);
  if (!Number.isSafeInteger(targetId) || targetId < 1) {
    return res.status(400).json({ error: true, message: "Identificador de usuário inválido." });
  }

  try {
    const result = await adminService.setUserBlocked(req.user.id, targetId, blocked);
    if (result.error) {
      const status = result.error === "NOT_FOUND" ? 404 : 400;
      return res.status(status).json({ error: true, message: result.message });
    }

    console.info("Admin account status changed", { blocked });
    return res.status(200).json({ error: false, user: result.user });
  } catch (error) {
    console.error("Admin account status update failed:", error.name);
    return res.status(500).json({ error: true, message: "Não foi possível alterar o status da conta." });
  }
};

const generateRecoveryCode = async (req, res) => {
  const targetId = Number(req.params.id);
  if (!Number.isSafeInteger(targetId) || targetId < 1) {
    return res.status(400).json({ error: true, message: "Identificador de usuário inválido." });
  }

  try {
    const result = await adminService.generateRecoveryCode(req.user.id, targetId);
    if (result.error) {
      return res.status(result.error === "NOT_FOUND" ? 404 : 400)
        .json({ error: true, message: result.message });
    }

    console.info("Admin generated account recovery code");
    return res.status(200).json({
      error: false,
      user: result.user,
      recoveryCode: result.recoveryCode,
      expiresAt: result.expiresAt,
    });
  } catch (error) {
    console.error("Admin recovery code generation failed:", error.name);
    return res.status(500).json({ error: true, message: "Não foi possível redefinir o acesso." });
  }
};

module.exports = { generateRecoveryCode, listUsers, setUserBlocked };
