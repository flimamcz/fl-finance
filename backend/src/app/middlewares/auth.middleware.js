const authService = require('../services/Auth.service');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: true,
        message: "Token de autorização inválido ou ausente.",
      });
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      return res.status(401).json({
        error: true,
        message: "Token de autorização inválido ou ausente.",
      });
    }

    const { error, message } = await authService.verifyToken(token);
    if (error) {
      return res.status(401).json({
        error: true,
        message: "Token inválido ou expirado",
      });
    }

    req.user = {
      id: message.id,
      email: message.email,
      username: message.username,
      name: message.name,
      isAdmin: Boolean(message.isAdmin),
    };
    return next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: true,
        message: "Token inválido ou expirado",
      });
    }

    console.error("Erro ao autenticar requisição:", error);
    return res.status(500).json({
      error: true,
      message: "Erro na autenticação",
    });
  }
};

module.exports = { authenticate };
