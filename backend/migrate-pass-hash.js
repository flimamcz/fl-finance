// migrate-passwords-once.js (salve na raiz do backend)
const { sequelize } = require('./src/models/');
const bcrypt = require('bcryptjs');

async function migrateAllPasswords() {
  try {
    console.log('🔄 Iniciando migração de todas as senhas...');
    
    // Conectar ao banco
    await sequelize.authenticate();
    console.log('✅ Conectado ao banco de dados');
    
    // Executar migração via service
    const { migrateExistingPasswords } = require('./src/app/services/User.service');
    const result = await migrateExistingPasswords();
    
    if (result.error) {
      console.error('❌ Erro na migração:', result.message);
    } else {
      console.log('✅', result.message);
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
    process.exit(1);
  }
}

// Executar
migrateAllPasswords();