"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) =>
    queryInterface.bulkInsert(
      "transactions",
      [
        {
          type_id: 1,
          value: 4124.45,
          description: "SALÁRIO",
          date: new Date(),
          status: true,
        },

        {
          type_id: 2,
          value: 1164.45,
          description: "GASTEI COM CARRO",
          date: new Date(),
          status: true,
        },

        {
          type_id: 3,
          value: 14124.45,
          description: "INVESTIDO",
          date: new Date(),
          status: false,
        },

        {
          type_id: 3,
          value: 6124.45,
          description: "INVESTIDO",
          date: new Date(),
          status: false,
        },
        {
          type_id: 3,
          value: 24124.45,
          description: "INVESTIDO",
          date: new Date(),
          status: false,
        },
        {
          type_id: 2,
          value: 7654.78,
          description: "EXPENSES",
          date: new Date(),
          status: false,
        },
        {
          type_id: 1,
          value: 9124.45,
          description: "RECIPES",
          date: new Date(),
          status: false,
        },
      ],
      {}
    ),

  down: async (queryInterface) =>
    queryInterface.bulkDelete("transactions", null, {}),
};
