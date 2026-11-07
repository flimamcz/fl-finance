const authService = require('../services/Auth.service');
const crypto = require("crypto");
const { csrfCookieName, getCookie, sessionCookieName } = require("../services/AuthCookie.service");

const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

const isValidCsrfToken = (cookieToken, headerToken) => {
  if (typeof cookieToken !== "string" || typeof headerToken !== "string") return false;
  const cookieBuffer = Buffer.from(cookieToken);
  const headerBuffer = Buffer.from(headerToken);
  return cookieBuffer.length === headerBuffer.length
    && crypto.timingSafeEqual(cookieBuffer, headerBuffer);
};

const authenticate = async (req, res, next) => {
  try {
    res.set("Cache-Control", "no-store");
    const token = getCookie(req, sessionCookieName);
    if (!token) {
      return res.status(401).json({
        error: true,
        message: "Sessão ausente. Faça login novamente.",
      });
    }

    if (!safeMethods.has(req.method)
      && !isValidCsrfToken(getCookie(req, csrfCookieName), req.get("X-CSRF-Token"))) {
      return res.status(401).json({
        error: true,
        message: "Token CSRF inválido ou ausente.",
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
