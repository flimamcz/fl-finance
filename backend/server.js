// src/server.js
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });
const app = require("./app");
const { settleDueInstallments } = require("./src/app/services/Debt.service");

if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET precisa estar configurado para iniciar o servidor.");
  process.exit(1);
}

const port = process.env.PORT || 3001;
const settleDebts = () => {
  settleDueInstallments().catch((error) => {
    console.error("Erro ao processar parcelas vencidas:", error);
  });
};

settleDebts();
setInterval(settleDebts, 60 * 1000);
// ❌ REMOVIDO host fixo (isso causava o EACCES)

console.log('\n🚀 === INICIANDO SERVIDOR ===');
console.log('📅', new Date().toISOString());
console.log('⚙️  Ambiente:', process.env.NODE_ENV || 'development');
console.log('🗄️  DB_HOST:', process.env.DB_HOST || 'NÃO DEFINIDO');

// ================================
// START SERVER (SEM IP FIXO)
// ================================
app.listen(port, "0.0.0.0", () => {
  console.log('\n✅ === SERVIDOR INICIADO ===');
  console.log(`   🔗 Local:      http://localhost:${port}`);
  console.log(`   🌐 Rede:       http://0.0.0.0:${port}`);
  console.log('\n📌 ENDPOINTS:');
  console.log(`   🔐 Auth:       http://localhost:${port}/auth`);
  console.log(`   💰 Transações: http://localhost:${port}/transactions`);
  console.log(`   📊 Tipos:      http://localhost:${port}/types`);
  console.log(`   👤 Usuários:   http://localhost:${port}/users`);
  console.log(`   🩺 Health:     http://localhost:${port}/health`);
  console.log(`\n🚀 Pronto para receber requisições!`);
});

// ================================
// TRATAMENTO GLOBAL DE ERROS
// ================================
process.on('uncaughtException', (error) => {
  console.error('💥 ERRO NÃO TRATADO:', error);
  console.error('💥 Stack:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 PROMISE REJEITADA:', reason);
  console.error('💥 Na promise:', promise);
});
