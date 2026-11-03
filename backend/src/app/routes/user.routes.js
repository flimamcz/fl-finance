const express = require("express");
const { authenticate } = require('../middlewares/auth.middleware');

// Importando do controller ATUAL (com as novas funções placeholder)
const {
  searchUsers,
  getMyProfile,
  updateMyProfile,
  updatePassword
} = require("../controllers/User.controller");

const router = express.Router();

console.log('🛣️  Rotas de User carregadas');

// Rotas públicas
router.get("/", searchUsers);

// 🔐 Rotas PROTEGIDAS
router.get("/me", authenticate, getMyProfile);
router.patch("/me", authenticate, updateMyProfile);
router.patch("/password", authenticate, updatePassword);

// Log das rotas registradas
console.log('✅ Rotas de User registradas:');
console.log('   GET    /users');
console.log('   GET    /users/me');
console.log('   PATCH  /users/me');
console.log('   PATCH  /users/password');

module.exports = router;