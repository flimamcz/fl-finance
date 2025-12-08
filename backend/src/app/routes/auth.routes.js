// routes/auth.routes.js
const express = require('express');
const { login, register, verify } = require('../controllers/Auth.controller');

const router = express.Router();

router.post('/login', login);
router.post('/register', register);
router.get('/verify', verify);

module.exports = router;