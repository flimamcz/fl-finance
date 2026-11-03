// src/app/middlewares/auth.middleware.js
const authService = require('../services/Auth.service');

const authenticate = async (req, res, next) => {
  console.log('🛡️ Middleware: Iniciando autenticação...');
  console.log('📨 Headers recebidos:', req.headers);
  
  try {
    // Verificar se há cabeçalho de autorização
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      console.log('❌ Middleware: Cabeçalho Authorization não encontrado');
      return res.status(401).json({ 
        error: true,
        message: "Token de autorização não fornecido" 
      });
    }
    
    console.log('🔑 Authorization header:', authHeader);
    
    // Verificar formato "Bearer token"
    if (!authHeader.startsWith('Bearer ')) {
      console.log('❌ Middleware: Formato inválido. Use: Bearer <token>');
      return res.status(401).json({ 
        error: true,
        message: "Formato de token inválido. Use: Bearer <token>" 
      });
    }
    
    // Extrair token
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      console.log('❌ Middleware: Token não encontrado após Bearer');
      return res.status(401).json({ 
        error: true,
        message: "Token não fornecido" 
      });
    }
    
    console.log('🔐 Token extraído (primeiros 20 chars):', token.substring(0, 20) + '...');
    
    // Verificar token
    const { error, message } = await authService.verifyToken(token);
    
    if (error) {
      console.log('❌ Middleware: Token inválido ou expirado');
      console.log('❌ Detalhes:', message);
      return res.status(401).json({ 
        error: true,
        message: "Token inválido ou expirado" 
      });
    }
    
    // Adiciona usuário à request
    console.log('✅ Middleware: Token válido!');
    console.log('👤 Usuário decodificado:', {
      id: message.id,
      email: message.email,
      name: message.name,
      exp: message.exp ? new Date(message.exp * 1000) : 'N/A'
    });
    
    req.user = {
      id: message.id,
      email: message.email,
      username: message.username,
      name: message.name,
      isAdmin: Boolean(message.isAdmin)
    };
    
    console.log('✅ Middleware: req.user definido:', req.user);
    next();
    
  } catch (error) {
    console.error('❌ Middleware ERROR:', error.message);
    console.error('❌ Stack:', error.stack);
    
    // Verificar tipo específico de erro
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: true,
        message: "Token inválido" 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: true,
        message: "Token expirado" 
      });
    }
    
    return res.status(500).json({ 
      error: true,
      message: "Erro na autenticação" 
    });
  }
};

module.exports = { authenticate };