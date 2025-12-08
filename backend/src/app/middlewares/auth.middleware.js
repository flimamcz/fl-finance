// middlewares/auth.middleware.js
const authService = require('../services/Auth.service');

const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: "Acesso não autorizado" });
    }

    const { error, message } = await authService.verifyToken(token);
    
    if (error) {
      return res.status(401).json({ message: "Token inválido ou expirado" });
    }

    // Adiciona usuário à request
    req.user = message;
    next();
    
  } catch (error) {
    return res.status(500).json({ message: "Erro na autenticação" });
  }
};

module.exports = { authenticate };