"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) =>
    queryInterface.bulkInsert(
      "transactions",
      [
        {
          type_id: 1,
          value: "4.235,45",
          description: "SALÁRIO",
          date: new Date(),
          status: true,
        },

        {
          type_id: 2,
          value: "2.235,45",
          description: "GASTEI COM CARRO",
          date: new Date(),
          status: true,
        },

        {
          type_id: 3,
          value: "1.135,45",
          description: "INVESTIDO",
          date: new Date(),
          status: false,
        },

        {
          type_id: 3,
          value: "1.135,45",
          description: "DESPESA",
          date: new Date(),
          status: false,
        },
        {
          type_id: 3,
          value: "1.135,45",
          description: "INVESTIDO",
          date: new Date(),
          status: false,
        },
        {
          type_id: 2,
          value: "1.135,45",
          description: "INVESTIDO",
          date: new Date(),
          status: false,
        },
        {
          type_id: 1,
          value: "1.135,45",
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
