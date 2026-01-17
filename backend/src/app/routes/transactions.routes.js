// src/app/routes/Transaction.routes.js - VERSÃO COMPLETA
const express = require('express');
const { authenticate } = require('../middlewares/auth.middleware');
const {
  searchTrasctions,
  createTrasaction,
  deleteTransaction,
  updateTransaction,
  getCategoriesByType,    // ✅ NOVO
  getAllCategories,       // ✅ NOVO
  validateCategory        // ✅ NOVO
} = require("../controllers/Transaction.controller");

const router = express.Router();

// 🔐 TODAS as rotas PROTEGIDAS por autenticação
console.log('🛣️  Rotas de Transaction carregadas');

// 📊 ROTAS DE TRANSAÇÕES

// GET /transactions - Listar transações do usuário
router.get('/', authenticate, (req, res, next) => {
  console.log('🛣️  Rota GET /transactions acessada');
  console.log('👤 Usuário:', req.user?.id);
  next();
}, searchTrasctions);

// POST /transactions - Criar nova transação
router.post('/', authenticate, (req, res, next) => {
  console.log('🛣️  Rota POST /transactions acessada');
  console.log('👤 Usuário:', req.user?.id);
  console.log('📦 Body:', req.body);
  next();
}, createTrasaction);

// PATCH /transactions - Atualizar transação
router.patch('/', authenticate, (req, res, next) => {
  console.log('🛣️  Rota PATCH /transactions acessada');
  console.log('👤 Usuário:', req.user?.id);
  console.log('📦 Body:', req.body);
  next();
}, updateTransaction);

// DELETE /transactions/:id - Deletar transação
router.delete('/:id', authenticate, (req, res, next) => {
  console.log('🛣️  Rota DELETE /transactions/:id acessada');
  console.log('👤 Usuário:', req.user?.id);
  console.log('🎯 Params:', req.params);
  next();
}, deleteTransaction);

// 🏷️ ROTAS DE CATEGORIAS (✅ NOVAS)

// GET /transactions/categories - Todas as categorias
router.get('/categories', authenticate, (req, res, next) => {
  console.log('🛣️  Rota GET /transactions/categories acessada');
  console.log('👤 Usuário:', req.user?.id);
  next();
}, getAllCategories);

// GET /transactions/categories/:typeId - Categorias por tipo
router.get('/categories/:typeId', authenticate, (req, res, next) => {
  console.log('🛣️  Rota GET /transactions/categories/:typeId acessada');
  console.log('👤 Usuário:', req.user?.id);
  console.log('🎯 TypeId:', req.params.typeId);
  next();
}, getCategoriesByType);

// POST /transactions/validate-category - Validar categoria
router.post('/validate-category', authenticate, (req, res, next) => {
  console.log('🛣️  Rota POST /transactions/validate-category acessada');
  console.log('👤 Usuário:', req.user?.id);
  console.log('📦 Body:', req.body);
  next();
}, validateCategory);

// Log de todas as rotas registradas
console.log('✅ Rotas registradas:');
console.log('   📊 TRANSAÇÕES:');
console.log('   GET    /transactions');
console.log('   POST   /transactions');
console.log('   PATCH  /transactions');
console.log('   DELETE /transactions/:id');
console.log('');
console.log('   🏷️  CATEGORIAS:');
console.log('   GET    /transactions/categories');
console.log('   GET    /transactions/categories/:typeId');
console.log('   POST   /transactions/validate-category');

module.exports = router;