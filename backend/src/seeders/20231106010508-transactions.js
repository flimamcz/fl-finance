// seeders/...-transactions.js - VERSÃO CORRIGIDA
"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Busca os IDs dos usuários de forma mais segura
    const [users] = await queryInterface.sequelize.query(
      `SELECT id FROM users WHERE email IN ('flp@test.com', 'edu@test.com') ORDER BY id;`
    );

    if (!users || users.length < 2) {
      console.info('ℹ️ Pulando transações de exemplo: crie usuários pelo fluxo de setup.');
      return;
    }

    const user1 = users.find(u => u.id === 1) || users[0];
    const user2 = users.find(u => u.id === 2) || users[1];
    
    return queryInterface.bulkInsert(
      "transactions",
      [
        // Transações do PRIMEIRO usuário encontrado
        {
          type_id: 1,
          user_id: user1.id,
          value: "4124.45",
          description: "SALÁRIO",
          date: new Date().toISOString().split('T')[0], // Formato YYYY-MM-DD
          status: true,
        },
        {
          type_id: 2,
          user_id: user1.id,
          value: "1164.45",
          description: "GASTEI COM CARRO",
          date: new Date().toISOString().split('T')[0],
          status: true,
        },
        {
          type_id: 3,
          user_id: user1.id,
          value: "14124.45",
          description: "INVESTIDO",
          date: new Date().toISOString().split('T')[0],
          status: false,
        },

        // Transações do SEGUNDO usuário encontrado
        {
          type_id: 3,
          user_id: user2.id,
          value: "6124.45",
          description: "INVESTIDO",
          date: new Date().toISOString().split('T')[0],
          status: false,
        },
        {
          type_id: 3,
          user_id: user2.id,
          value: "24124.45",
          description: "INVESTIDO",
          date: new Date().toISOString().split('T')[0],
          status: false,
        },
        {
          type_id: 2,
          user_id: user2.id,
          value: "7654.78",
          description: "EXPENSES",
          date: new Date().toISOString().split('T')[0],
          status: false,
        },
        {
          type_id: 1,
          user_id: user2.id,
          value: "9124.45",
          description: "RECIPES",
          date: new Date().toISOString().split('T')[0],
          status: false,
        },
      ],
      {}
    );
  },

  down: async (queryInterface) =>
    queryInterface.bulkDelete("transactions", null, {}),
};