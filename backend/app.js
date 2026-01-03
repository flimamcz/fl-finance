// src/app.js
const express = require("express");
const cors = require("cors");

const transactionsRouter = require("./src/app/routes/transactions.routes");
const userRouter = require("./src/app/routes/user.routes");
const typesRouter = require("./src/app/routes/type.routes");
const authRouter = require("./src/app/routes/auth.routes");

const app = express();

// 🔍 MIDDLEWARE DE LOG PARA TODAS AS REQUISIÇÕES
app.use((req, res, next) => {
  console.log('\n📨 === NOVA REQUISIÇÃO ===');
  console.log('🕐', new Date().toISOString());
  console.log('🔹 Método:', req.method);
  console.log('🔹 URL:', req.originalUrl);
  console.log('🔹 Authorization:', req.headers.authorization ? 'SIM' : 'NÃO');
  console.log('🔹 Content-Type:', req.headers['content-type']);
  console.log('🔹 Body:', req.method !== 'GET' ? req.body : 'N/A');
  next();
});

// ⭐ CORS SUPER PERMISSIVO ⭐
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept", "X-Requested-With"],
  exposedHeaders: ["Content-Length", "Authorization"],
  credentials: false,
  maxAge: 86400
}));

// Middleware customizado para headers extras
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "*");
  res.header("Access-Control-Allow-Methods", "*");
  
  // Handle preflight requests
  if (req.method === "OPTIONS") {
    console.log('🛫 Resposta preflight OPTIONS');
    return res.status(200).end();
  }
  
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rotas com logs
console.log('\n🚀 === REGISTRANDO ROTAS ===');

// Rotas
app.use("/users", (req, res, next) => {
  console.log('🛣️  Rota /users acessada');
  next();
}, userRouter);

app.use("/transactions", (req, res, next) => {
  console.log('🛣️  Rota /transactions acessada');
  next();
}, transactionsRouter);

app.use("/types", (req, res, next) => {
  console.log('🛣️  Rota /types acessada');
  next();
}, typesRouter);

app.use("/auth", (req, res, next) => {
  console.log('🛣️  Rota /auth acessada');
  next();
}, authRouter);

// Rota de health check
app.get("/health", (req, res) => {
  console.log('🩺 Health check acionado');
  res.status(200).json({ 
    status: "OK", 
    message: "Backend está rodando",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Rota raiz
app.get("/", (req, res) => {
  console.log('🏠 Rota raiz acionada');
  res.json({
    message: "API FL Finanças",
    version: "1.0.0",
    endpoints: {
      auth: {
        login: "POST /auth/login",
        register: "POST /auth/register",
        verify: "GET /auth/verify"
      },
      transactions: {
        list: "GET /transactions (com autenticação)",
        create: "POST /transactions (com autenticação)",
        update: "PATCH /transactions (com autenticação)",
        delete: "DELETE /transactions/:id (com autenticação)"
      },
      types: "GET /types",
      users: "GET /users"
    }
  });
});

// Tratamento de rotas não encontradas
app.use((req, res) => {
  console.log('❌ Rota não encontrada:', req.originalUrl);
  res.status(404).json({
    error: true,
    message: "Rota não encontrada",
    path: req.originalUrl,
    method: req.method
  });
});

// Tratamento de erros global
app.use((err, req, res, next) => {
  console.error('🔥 ERRO GLOBAL DO SERVIDOR:');
  console.error('🔴 Mensagem:', err.message);
  console.error('🔴 Stack:', err.stack);
  console.error('🔴 URL:', req.originalUrl);
  console.error('🔴 Método:', req.method);
  
  res.status(500).json({
    error: true,
    message: "Erro interno do servidor",
    details: process.env.NODE_ENV === "development" ? err.message : undefined,
    timestamp: new Date().toISOString()
  });
});

console.log('\n✅ App configurado com sucesso!\n');

module.exports = app;