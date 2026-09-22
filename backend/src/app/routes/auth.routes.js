// routes/auth.routes.js
const express = require('express');
const { login, register, verify, forgotPassword, resetPassword } = require('../controllers/Auth.controller');

const router = express.Router();

router.post('/login', login);
router.post('/register', register);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/verify', verify);

module.exports = router;