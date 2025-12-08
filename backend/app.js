const express = require("express");
const cors = require("cors");

const transactionsRouter = require("./src/app/routes/transactions.routes");
const userRouter = require("./src/app/routes/user.routes");
const typesRouter = require("./src/app/routes/type.routes");
const authRouter = require("./src/app/routes/auth.routes");

const app = express();

// ⭐⭐ CORS SUPER PERMISSIVO ⭐⭐
app.use(cors({
  origin: "*", // ACEITA QUALQUER ORIGEM (localhost, IP, ngrok, etc)
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept", "X-Requested-With"],
  exposedHeaders: ["Content-Length", "Authorization"],
  credentials: false,
  maxAge: 86400 // Cache de 24 horas
}));

// Middleware customizado para headers extras (opcional mas bom)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "*");
  res.header("Access-Control-Allow-Methods", "*");
  
  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rotas
app.use("/users", userRouter);
app.use("/transactions", transactionsRouter);
app.use("/types", typesRouter);
app.use("/auth", authRouter);

// Rota de health check
app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "OK", 
    message: "Backend está rodando",
    timestamp: new Date().toISOString()
  });
});

// Rota raiz
app.get("/", (req, res) => {
  res.json({
    message: "API FL Finanças",
    version: "1.0.0",
    endpoints: {
      auth: "/auth",
      transactions: "/transactions",
      types: "/types",
      users: "/users"
    }
  });
});

// Tratamento de rotas não encontradas
app.use((req, res) => {
  res.status(404).json({
    error: true,
    message: "Rota não encontrada",
    path: req.originalUrl
  });
});

// Tratamento de erros global
app.use((err, req, res, next) => {
  console.error("Erro no servidor:", err);
  res.status(500).json({
    error: true,
    message: "Erro interno do servidor",
    details: process.env.NODE_ENV === "development" ? err.message : undefined
  });
});

module.exports = app;