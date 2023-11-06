// src/seeders/[timestamp]-users.js

"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) =>
    queryInterface.bulkInsert(
      "types",
      [
        {
          type: "RECEITA",
        },

        {
          type: "DESPESA",
        },

        {
          type: "INVESTIMENTO",
        },
      ],
      {}
    ),

  down: async (queryInterface) => queryInterface.bulkDelete("types", null, {}),
};
