// src/server.js
require("dotenv").config();
const app = require("./app");

const port = process.env.PORT || 3001;
const host = process.env.HOST || '192.168.0.10'; // Use variável de ambiente

console.log('\n🚀 === INICIANDO SERVIDOR ===');
console.log('📅', new Date().toISOString());
console.log('⚙️  Ambiente:', process.env.NODE_ENV || 'development');
console.log('🔑 JWT_SECRET:', process.env.JWT_SECRET ? 'DEFINIDO' : 'NÃO DEFINIDO');
console.log('🗄️  DB_HOST:', process.env.DB_HOST || 'NÃO DEFINIDO');

// Verificar variáveis de ambiente críticas
if (!process.env.JWT_SECRET) {
  console.warn('⚠️  AVISO: JWT_SECRET não definido no .env! Usando valor padrão.');
}

app.listen(port, host, () => {
  console.log('\n✅ === SERVIDOR INICIADO ===');
  console.log(`   🔗 Local:      http://localhost:${port}`);
  console.log(`   🌐 Rede:       http://${host}:${port}`);
  console.log('\n📌 ENDPOINTS:');
  console.log(`   🔐 Auth:       http://${host}:${port}/auth`);
  console.log(`   💰 Transações: http://${host}:${port}/transactions`);
  console.log(`   📊 Tipos:      http://${host}:${port}/types`);
  console.log(`   👤 Usuários:   http://${host}:${port}/users`);
  console.log(`   🩺 Health:     http://${host}:${port}/health`);
  console.log(`\n🚀 Pronto para receber requisições!`);
});

// Tratamento de erros de inicialização
process.on('uncaughtException', (error) => {
  console.error('💥 ERRO NÃO TRATADO:', error);
  console.error('💥 Stack:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 PROMISE REJEITADA:', reason);
  console.error('💥 Na promise:', promise);
});