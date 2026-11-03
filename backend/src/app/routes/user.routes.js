const express = require("express");
const { authenticate } = require('../middlewares/auth.middleware');
const requireAdmin = (req, res, next) => {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ error: true, message: "Acesso restrito a administradores." });
  }
  return next();
};

// Importando do controller ATUAL (com as novas funções placeholder)
const {
  searchUsers,
  getMyProfile,
  updateMyProfile,
  updatePassword
} = require("../controllers/User.controller");

const router = express.Router();

// Diretório de usuários é restrito a administradores.
router.get("/", authenticate, requireAdmin, searchUsers);

// 🔐 Rotas PROTEGIDAS
router.get("/me", authenticate, getMyProfile);
router.patch("/me", authenticate, updateMyProfile);
router.patch("/password", authenticate, updatePassword);

module.exports = router;