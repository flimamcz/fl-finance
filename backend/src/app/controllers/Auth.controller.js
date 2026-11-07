// src/app/controllers/Auth.controller.js
const authService = require('../services/Auth.service');
const jwt = require("jsonwebtoken");
const { clearAuthCookies, csrfCookieName, getCookie, sessionCookieName, setAuthCookies } =
  require("../services/AuthCookie.service");

const setupStatus = async (req, res) => {
  try {
    res.set("Cache-Control", "no-store");
    return res.status(200).json(await authService.getSetupStatus());
  } catch (error) {
    console.error("Setup status request failed:", error.name);
    return res.status(500).json({ error: true, message: "Não foi possível verificar a configuração inicial" });
  }
};

const setupAdmin = async (req, res) => {
  try {
    res.set("Cache-Control", "no-store");
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: true, message: "Usuário, email e senha são obrigatórios" });
    }

    const result = await authService.setupAdmin({ username, email, password });
    if (result.error) {
      return res.status(400).json(result);
    }
    const csrfToken = setAuthCookies(res, result.message.token, true);
    const expiresAt = jwt.decode(result.message.token).exp * 1000;
    return res.status(201).json({
      error: false,
      user: result.message.user,
      csrfToken,
      expiresAt,
    });
  } catch (error) {
    console.error("Admin setup request failed:", error.name);
    return res.status(500).json({ error: true, message: "Erro interno no servidor" });
  }
};

const forgotPassword = async (req, res) => {
  const email = req.body?.email;
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ error: true, message: "Informe um email válido." });
  }
  return res.status(200).json({
    error: false,
    message: "Se a conta existir, use o código de recuperação salvo ao criar a conta.",
  });
};

const resetPassword = async (req, res) => {
  const { email, code, newPassword } = req.body || {};
  if (typeof email !== "string" || typeof code !== "string" || typeof newPassword !== "string"
    || !email.trim() || !code || !newPassword) {
    return res.status(400).json({ error: true, message: "Email, código e nova senha são obrigatórios." });
  }
  if (!/^\d{6}$/.test(code)) {
    return res.status(400).json({ error: true, message: "O código de recuperação é inválido." });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: true, message: "A nova senha deve ter pelo menos 6 caracteres." });
  }

  try {
    const result = await authService.resetPassword(email.toLowerCase().trim(), code, newPassword);
    if (result.error) return res.status(400).json({ error: true, message: "Email ou código de recuperação inválidos." });
    return res.status(200).json({
      error: false,
      message: result.message,
      recoveryCode: result.recoveryCode,
    });
  } catch (error) {
    console.error("Password recovery request failed:", error.name);
    return res.status(500).json({ error: true, message: "Não foi possível redefinir a senha." });
  }
};

const login = async (req, res) => {
  try {
    res.set("Cache-Control", "no-store");
    const { identifier, username, email, password, rememberMe } = req.body;
    const loginIdentifier = identifier || username || email;
    
    if (!loginIdentifier || !password) {
      return res.status(400).json({ 
        error: true, 
        message: "Usuário ou email e senha são obrigatórios"
      });
    }

    const loginResult = await authService.login(loginIdentifier, password);
    const { error, message } = loginResult;
    
    if (error) {
      return res.status(loginResult.blocked ? 403 : 401).json({
        error: true, 
        message 
      });
    }

    const csrfToken = setAuthCookies(res, message.token, rememberMe === true);
    const expiresAt = jwt.decode(message.token).exp * 1000;
    return res.status(200).json({
      error: false,
      user: message.user,
      csrfToken,
      expiresAt,
    });
    
  } catch (error) {
    console.error("Login request failed:", error.name);
    return res.status(500).json({ 
      error: true, 
      message: "Erro interno no servidor" 
    });
  }
};

const verify = async (req, res) => {
  try {
    res.set("Cache-Control", "no-store");
    const token = getCookie(req, sessionCookieName);
    if (!token) {
      return res.status(401).json({ 
        error: true, 
        message: "Sessão ausente"
      });
    }

    const { error, message } = await authService.verifyToken(token);
    
    if (error) {
      clearAuthCookies(res);
      return res.status(401).json({ 
        error: true, 
        message 
      });
    }

    return res.status(200).json({
      error: false,
      user: { authenticated: true, isAdmin: Boolean(message.isAdmin) },
      csrfToken: getCookie(req, csrfCookieName),
      expiresAt: jwt.decode(token).exp * 1000,
    });
    
  } catch (error) {
    console.error("Session verification request failed:", error.name);
    return res.status(500).json({ 
      error: true, 
      message: "Erro interno no servidor" 
    });
  }

};

const logout = (req, res) => {
  clearAuthCookies(res);
  return res.status(200).json({ error: false });
};

const register = async (req, res) => {
  try {
    const { fullname, username, email, password } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ 
        error: true, 
        message: "Usuário, email e senha são obrigatórios"
      });
    }

    const { error, message } = await authService.register({
      fullname,
      username,
      email,
      password
    });
    
    if (error) {
      return res.status(400).json({ 
        error: true, 
        message 
      });
    }

    return res.status(201).json({
      error: false,
      ...message
    });
    
  } catch (error) {
    console.error("Registration request failed:", error.name);
    return res.status(500).json({ 
      error: true, 
      message: "Erro interno no servidor" 
    });
  }
};

module.exports = {
  login,
  logout,
  verify,
  setupStatus,
  setupAdmin,
  register,
  forgotPassword,
  resetPassword
};