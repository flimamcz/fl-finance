// routes/auth.routes.js
const express = require('express');
const {
  limitLogin,
  limitRegister,
  limitRecoveryByEmail,
  limitRecoveryByIp,
  limitFirstAdmin,
} = require("../middlewares/rateLimit.middleware");
const { create: createFirstAdmin } = require("../controllers/FirstAdmin.controller");
const {
  login,
  logout,
  register,
  verify,
  forgotPassword,
  resetPassword,
} = require('../controllers/Auth.controller');

const router = express.Router();

router.post('/login', limitLogin, login);
router.post('/logout', logout);
router.post('/register', limitRegister, register);
router.post('/forgot-password', limitRecoveryByIp, limitRecoveryByEmail, forgotPassword);
router.post('/reset-password', limitRecoveryByIp, limitRecoveryByEmail, resetPassword);
router.post('/first-admin', limitFirstAdmin, createFirstAdmin);
router.get('/verify', verify);

module.exports = router;