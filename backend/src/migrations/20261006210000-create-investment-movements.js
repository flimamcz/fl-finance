"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("investment_movements", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      user_id: {
        allowNull: false,
        type: Sequelize.INTEGER,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      transaction_id: {
        allowNull: false,
        unique: true,
        type: Sequelize.INTEGER,
        references: { model: "transactions", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      request_id: {
        allowNull: false,
        type: Sequelize.STRING(64),
      },
      type: {
        allowNull: false,
        type: Sequelize.STRING(12),
      },
      amount: {
        allowNull: false,
        type: Sequelize.DECIMAL(12, 2),
      },
      date: {
        allowNull: false,
        type: Sequelize.DATEONLY,
      },
      description: {
        allowNull: true,
        type: Sequelize.STRING(255),
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn("NOW"),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn("NOW"),
      },
    });

    await queryInterface.addIndex("investment_movements", ["user_id", "date"]);
    await queryInterface.addIndex("investment_movements", ["user_id", "request_id"], {
      unique: true,
      name: "investment_movements_user_request_unique",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("investment_movements");
  },
};
