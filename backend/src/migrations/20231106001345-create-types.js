"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("types", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },

      type: {
        allowNull: false,
        type: Sequelize.STRING,
        unique: {
          args: true,
          msg: "Existing type",
        },
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("types");
  },
};
