// src/app/routes/Transaction.routes.js
const express = require('express');
const { authenticate } = require('../middlewares/auth.middleware');
const {
  searchTrasctions,
  createTrasaction,
  deleteTransaction,
  updateTransaction,
} = require("../controllers/Transaction.controller");

const router = express.Router();

// 🔐 TODAS as rotas PROTEGIDAS por autenticação
console.log('🛣️  Rotas de Transaction carregadas');

// Rota: GET /transactions - Listar transações do usuário
router.get('/', authenticate, (req, res, next) => {
  console.log('🛣️  Rota GET /transactions acessada');
  console.log('👤 Usuário na rota:', req.user);
  next();
}, searchTrasctions);

// Rota: POST /transactions - Criar nova transação
router.post('/', authenticate, (req, res, next) => {
  console.log('🛣️  Rota POST /transactions acessada');
  console.log('👤 Usuário:', req.user);
  console.log('📦 Body:', req.body);
  next();
}, createTrasaction);

// Rota: PATCH /transactions - Atualizar transação
router.patch('/', authenticate, (req, res, next) => {
  console.log('🛣️  Rota PATCH /transactions acessada');
  console.log('👤 Usuário:', req.user);
  console.log('📦 Body:', req.body);
  next();
}, updateTransaction);

// Rota: DELETE /transactions/:id - Deletar transação
router.delete('/:id', authenticate, (req, res, next) => {
  console.log('🛣️  Rota DELETE /transactions/:id acessada');
  console.log('👤 Usuário:', req.user);
  console.log('🎯 Params:', req.params);
  next();
}, deleteTransaction);

// Log de todas as rotas registradas
console.log('✅ Rotas registradas:');
console.log('   GET    /transactions');
console.log('   POST   /transactions');
console.log('   PATCH  /transactions');
console.log('   DELETE /transactions/:id');

module.exports = router;