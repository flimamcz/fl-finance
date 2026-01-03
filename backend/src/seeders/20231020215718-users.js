// seeders/...-users.js - CORRIGIDO
"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert(
      "users",
      [
        {
          fullname: "Filipe", // ✅ fullname (não fullName)
          email: "flp@test.com",
          password: "flp5660",
          position_work: "AADM",
          user_pf: "filipe.fla",
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          fullname: "Eduardo", // ✅ fullname (não fullName)
          email: "edu@test.com",
          password: "flp5660",
          position_work: "APF",
          user_pf: "filipe.fla",
          created_at: new Date(),
          updated_at: new Date(),
        },
      ],
      {}
    );
  },

  down: async (queryInterface) => queryInterface.bulkDelete("users", null, {}),
};