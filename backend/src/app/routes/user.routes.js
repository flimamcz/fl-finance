const express = require("express");
const { authenticate } = require('../middlewares/auth.middleware');
const { requireAdmin } = require("../middlewares/admin.middleware");

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