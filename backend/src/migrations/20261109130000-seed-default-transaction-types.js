"use strict";

const defaultTypes = [
  { id: 1, type: "RECEITA" },
  { id: 2, type: "DESPESA" },
  { id: 3, type: "INVESTIMENTO" },
];

module.exports = {
  async up(queryInterface, Sequelize) {
    const existingTypes = await queryInterface.sequelize.query(
      "SELECT id, type FROM Types",
      { type: Sequelize.QueryTypes.SELECT }
    );

    const missingTypes = defaultTypes.filter((defaultType) => {
      const byId = existingTypes.find((type) => Number(type.id) === defaultType.id);
      const byName = existingTypes.find((type) => type.type === defaultType.type);

      if (byId && byId.type !== defaultType.type) {
        throw new Error(`Transaction type id ${defaultType.id} is already in use.`);
      }

      if (byName && Number(byName.id) !== defaultType.id) {
        throw new Error(`Transaction type ${defaultType.type} has an unexpected id.`);
      }

      return !byId && !byName;
    });

    if (missingTypes.length > 0) {
      await queryInterface.bulkInsert("Types", missingTypes);
    }
  },

  async down() {
    // Keep these canonical reference rows because existing transactions depend on their ids.
  },
};
