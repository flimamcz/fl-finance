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

      typeId: {
        allowNull: false,
        type: Sequelize.INTEGER,
        field: "type_id",
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
        type: Sequelize.DATE,
        allowNull: false,
      },

      status: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("transactions");
  },
};
