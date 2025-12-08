// src/app/controllers/Auth.controller.js
const authService = require('../services/Auth.service');

const login = async (req, res) => {
  try {
    console.log("Login request body:", req.body);
    
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        error: true, 
        message: "Email e senha são obrigatórios" 
      });
    }

    const { error, message } = await authService.login(email, password);
    
    if (error) {
      return res.status(401).json({ 
        error: true, 
        message 
      });
    }

    return res.status(200).json({
      error: false,
      ...message
    });
    
  } catch (error) {
    console.error("Controller login error:", error);
    return res.status(500).json({ 
      error: true, 
      message: "Erro interno no servidor" 
    });
  }
};

const verify = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: true, 
        message: "Token não fornecido" 
      });
    }

    const token = authHeader.split(' ')[1];
    const { error, message } = await authService.verifyToken(token);
    
    if (error) {
      return res.status(401).json({ 
        error: true, 
        message 
      });
    }

    return res.status(200).json({
      error: false,
      user: message
    });
    
  } catch (error) {
    console.error("Controller verify error:", error);
    return res.status(500).json({ 
      error: true, 
      message: "Erro interno no servidor" 
    });
  }

};

const register = async (req, res) => {
  try {
    console.log("Register request body:", req.body);
    
    const { fullname, email, password } = req.body;
    
    if (!fullname || !email || !password) {
      return res.status(400).json({ 
        error: true, 
        message: "Todos os campos são obrigatórios" 
      });
    }

    // Você precisa criar authService.register() primeiro!
    const { error, message } = await authService.register({
      fullname,
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
    console.error("Controller register error:", error);
    return res.status(500).json({ 
      error: true, 
      message: "Erro interno no servidor" 
    });
  }
};

module.exports = {
  login,
  verify,
  register
};