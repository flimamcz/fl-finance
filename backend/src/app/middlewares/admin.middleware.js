"use strict";

const requireAdmin = (req, res, next) => {
  if (!req.user?.isAdmin) {
    return res.status(403).json({
      error: true,
      message: "Acesso restrito a administradores.",
    });
  }
  return next();
};

module.exports = { requireAdmin };
