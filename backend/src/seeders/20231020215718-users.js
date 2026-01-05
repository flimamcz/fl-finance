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
          password: "$2b$10$SMPAOYjNRl44b5e6TYYJh.2z885kWMC1lQBeSJbQrXUJV6XpeizBK",
          position_work: "AADM",
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          fullname: "Eduardo", // ✅ fullname (não fullName)
          email: "edu@test.com",
          password: "flp5660",
          position_work: "APF",
          created_at: new Date(),
          updated_at: new Date(),
        },
      ],
      {}
    );
  },

  down: async (queryInterface) => queryInterface.bulkDelete("users", null, {}),
};