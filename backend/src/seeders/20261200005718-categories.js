// src/seeders/[timestamp]-categories.js
"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert(
      "Categories",
      [
        // RECEITAS (type_id: 1)
        { name: "Salário", type_id: 1, icon: "💰", color: "#22c55e" },
        { name: "Freelance", type_id: 1, icon: "💼", color: "#10b981" },
        { name: "Venda", type_id: 1, icon: "🛒", color: "#84cc16" },
        { name: "Presente", type_id: 1, icon: "🎁", color: "#f59e0b" },
        { name: "Outros", type_id: 1, icon: "📄", color: "#94a3b8" },
        
        // DESPESAS (type_id: 2)
        { name: "Alimentação", type_id: 2, icon: "🍕", color: "#ef4444" },
        { name: "Moradia", type_id: 2, icon: "🏠", color: "#dc2626" },
        { name: "Transporte", type_id: 2, icon: "🚗", color: "#b91c1c" },
        { name: "Lazer", type_id: 2, icon: "🎬", color: "#f97316" },
        { name: "Saúde", type_id: 2, icon: "🏥", color: "#d97706" },
        { name: "Outros", type_id: 2, icon: "📄", color: "#94a3b8" },
        
        // INVESTIMENTOS (type_id: 3)
        { name: "Tesouro Direto", type_id: 3, icon: "🏦", color: "#3b82f6" },
        { name: "Ações", type_id: 3, icon: "📈", color: "#1d4ed8" },
        { name: "Criptomoedas", type_id: 3, icon: "₿", color: "#f59e0b" },
        { name: "Outros", type_id: 3, icon: "📄", color: "#94a3b8" },
      ],
      {}
    );
  },

  down: async (queryInterface) =>
    queryInterface.bulkDelete("Categories", null, {}),
};