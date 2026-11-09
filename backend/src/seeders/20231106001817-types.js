// src/seeders/[timestamp]-users.js

"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const defaultTypes = ["RECEITA", "DESPESA", "INVESTIMENTO"];
    const existingTypes = await queryInterface.sequelize.query(
      "SELECT type FROM Types",
      { type: Sequelize.QueryTypes.SELECT }
    );
    const existingTypeNames = new Set(existingTypes.map(({ type }) => type));
    const missingTypes = defaultTypes
      .filter((type) => !existingTypeNames.has(type))
      .map((type) => ({ type }));

    if (missingTypes.length > 0) {
      await queryInterface.bulkInsert("Types", missingTypes);
    }
  },

  down: async (queryInterface) => queryInterface.bulkDelete("Types", null, {}),
};
