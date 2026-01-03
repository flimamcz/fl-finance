"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      "users",
      {
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

        createdAt: {
          field: "created_at",
          type: Sequelize.DATE,
        },
        updatedAt: {
          field: "updated_at",
          type: Sequelize.DATE,
        },

        user_pf: {
          type: Sequelize.STRING,
          allowNull: false,
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
      },
      { timestamp: true, underscored: true }
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("users");
  },
};
