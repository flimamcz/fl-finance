// routes/auth.routes.js
const express = require('express');
const {
  limitLogin,
  limitRegister,
  limitRecoveryByEmail,
  limitRecoveryByIp,
  limitSetup,
} = require("../middlewares/rateLimit.middleware");
const {
  login,
  logout,
  register,
  verify,
  forgotPassword,
  resetPassword,
  setupStatus,
  setupAdmin,
} = require('../controllers/Auth.controller');

const router = express.Router();

router.get('/setup-status', setupStatus);
router.post('/setup', limitSetup, setupAdmin);
router.post('/login', limitLogin, login);
router.post('/logout', logout);
router.post('/register', limitRegister, register);
router.post('/forgot-password', limitRecoveryByIp, limitRecoveryByEmail, forgotPassword);
router.post('/reset-password', limitRecoveryByIp, limitRecoveryByEmail, resetPassword);
router.get('/verify', verify);

module.exports = router;