// src/server.js
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });
const app = require("./app");
const { settleDueInstallments } = require("./src/app/services/Debt.service");

if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET precisa estar configurado para iniciar o servidor.");
  process.exit(1);
}

const port = Number(process.env.PORT) || 5000;
const host = process.env.HOST || (process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1");
const settleDebts = () => {
  settleDueInstallments().catch((error) => {
    console.error("Scheduled debt settlement failed:", error?.name || "UnknownError");
  });
};

settleDebts();
setInterval(settleDebts, 60 * 1000);

console.info("Starting FL Finance API", {
  environment: process.env.NODE_ENV || "development",
  port,
});

const server = app.listen(port, host, () => {
  console.info("FL Finance API is listening", {
    environment: process.env.NODE_ENV || "development",
    port,
  });
});

server.on("error", (error) => {
  console.error("FL Finance API failed to listen", {
    name: error.name,
    code: error.code,
  });
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught server exception", {
    name: error.name,
    code: error.code,
  });
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled server rejection", {
    name: reason instanceof Error ? reason.name : typeof reason,
  });
  process.exit(1);
});
