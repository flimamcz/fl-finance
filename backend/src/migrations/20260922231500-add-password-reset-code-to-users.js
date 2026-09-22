"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("users", "reset_code_hash", {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn("users", "reset_code_hint", {
      type: Sequelize.STRING(6),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("users", "reset_code_hash");
    await queryInterface.removeColumn("users", "reset_code_hint");
  },
};
