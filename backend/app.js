// src/app.js
const express = require("express");
const cors = require("cors");

const transactionsRouter = require("./src/app/routes/transactions.routes");
const userRouter = require("./src/app/routes/user.routes");
const typesRouter = require("./src/app/routes/type.routes");
const authRouter = require("./src/app/routes/auth.routes");
const debtsRouter = require("./src/app/routes/debts.routes");
const investmentsRouter = require("./src/app/routes/investments.routes");
const adminRouter = require("./src/app/routes/admin.routes");

const app = express();

if (process.env.TRUST_PROXY === "1") {
  app.set("trust proxy", 1);
}

const defaultOrigins = process.env.NODE_ENV === "production"
  ? ""
  : "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173";
const allowedOrigins = [
  "https://fl-finance.vercel.app",
  "https://fl-finance-12nf.vercel.app",
  ...(process.env.FRONTEND_ORIGINS || defaultOrigins).split(","),
]
  .map((origin) => origin.trim())
  .filter(Boolean);


app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.warn(`CORS bloqueou origem: ${origin}`);
    return callback(null, false);
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "X-CSRF-Token", "X-Admin-Bootstrap-Token"],
  credentials: true,
  maxAge: 86400
}));

app.use((req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();

  const origin = req.get("Origin");
  if (origin && allowedOrigins.includes(origin)) return next();

  return res.status(403).json({
    error: true,
    message: "Origem não autorizada para esta operação.",
  });
});

app.use((req, res, next) => {
  res.set("X-Content-Type-Options", "nosniff");
  res.set("X-Frame-Options", "DENY");
  res.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

app.use("/users", userRouter);
app.use("/transactions", transactionsRouter);
app.use("/debts", debtsRouter);
app.use("/investments", investmentsRouter);
app.use("/types", typesRouter);
app.use("/auth", authRouter);
app.use("/admin", adminRouter);

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
      auth: {
        login: "POST /auth/login",
        register: "POST /auth/register (after setup)",
        verify: "GET /auth/verify"
      },
      admin: "GET /admin/users (administrators only)",
      transactions: {
        list: "GET /transactions (com autenticação)",
        create: "POST /transactions (com autenticação)",
        update: "PATCH /transactions (com autenticação)",
        delete: "DELETE /transactions/:id (com autenticação)"
      },
      types: "GET /types",
      users: "GET /users (admin only)"
    }
  });
});

// Tratamento de rotas não encontradas
app.use((req, res) => {
  res.status(404).json({
    error: true,
    message: "Rota não encontrada",
    path: req.originalUrl,
    method: req.method
  });
});

// Tratamento de erros global
app.use((err, req, res, next) => {
  console.error("Erro não tratado na API:", err);
  
  res.status(500).json({
    error: true,
    message: "Erro interno do servidor",
    timestamp: new Date().toISOString()
  });
});

module.exports = app;