// src/server.js
require("dotenv").config();
const app = require("./app");

const port = process.env.PORT || 3001;
// ❌ REMOVIDO host fixo (isso causava o EACCES)

console.log('\n🚀 === INICIANDO SERVIDOR ===');
console.log('📅', new Date().toISOString());
console.log('⚙️  Ambiente:', process.env.NODE_ENV || 'development');
console.log('🔑 JWT_SECRET:', process.env.JWT_SECRET ? 'DEFINIDO' : 'NÃO DEFINIDO');
console.log('🗄️  DB_HOST:', process.env.DB_HOST || 'NÃO DEFINIDO');

// Verificar variáveis de ambiente críticas
if (!process.env.JWT_SECRET) {
  console.warn('⚠️  AVISO: JWT_SECRET não definido no .env! Usando valor padrão.');
}

// ================================
// START SERVER (SEM IP FIXO)
// ================================
app.listen(port, () => {
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
