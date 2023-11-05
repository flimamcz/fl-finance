"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("users", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },

      fullname: {
        type: Sequelize.STRING,
        allowNull: false,
      },

      userPF: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: {
          args: true,
          msg: "USER PF already in use!",
        },
        field: "user_pf",
      },

      email: {
        type: Sequelize.STRING,
        unique: {
          args: true,
          msg: "Email address already in use!",
        },
        allowNull: false,
      },

      password: {
        type: Sequelize.STRING,
        allowNull: false,
      },

      positionWork: {
        allowNull: true,
        type: Sequelize.STRING,
        field: "position_work",
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("users");
  },
};
