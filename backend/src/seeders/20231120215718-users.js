// src/seeders/[timestamp]-users.js

"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) =>
    queryInterface.bulkInsert(
      "users",
      [
        {
          fullName: "Leonardo",
          email: "leo@test.com",
          password: "test1213",
          position_work: "AADM",
          user_pf: "filipe.fla",
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          fullName: "Eduardo",
          email: "edu@test.com",
          password: "test121323",
          position_work: "APF",
          user_pf: "filipe.fla",
          created_at: new Date(),
          updated_at: new Date(),
        },
      ],
      {}
    ),

  down: async (queryInterface) => queryInterface.bulkDelete("users", null, {}),
};
