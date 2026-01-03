// Encontre seu arquivo: migrations/20231106010508-transactions.js
"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("transactions", {
      id: {
        allowNull: false,
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      type_id: {
        allowNull: false,
        type: Sequelize.INTEGER,
      },

      // ✅ ALTERE PARA allowNull: true (pelo menos inicialmente)
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: true, // ✅ MUDOU DE false PARA true
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },

      value: {
        type: Sequelize.STRING,
        allowNull: false,
      },

      description: {
        allowNull: false,
        type: Sequelize.STRING,
      },

      date: {
        type: Sequelize.STRING,
        allowNull: false,
      },

      status: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
      },
    });

    // Opcional: índice para melhor performance
    await queryInterface.addIndex('transactions', ['user_id']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("transactions");
  },
};