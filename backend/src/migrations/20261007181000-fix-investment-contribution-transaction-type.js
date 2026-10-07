"use strict";

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE transactions AS transaction_record
      INNER JOIN investment_movements AS movement
        ON movement.transaction_id = transaction_record.id
      SET transaction_record.type_id = 3
      WHERE movement.type = 'contribution'
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE transactions AS transaction_record
      INNER JOIN investment_movements AS movement
        ON movement.transaction_id = transaction_record.id
      SET transaction_record.type_id = 2
      WHERE movement.type = 'contribution'
    `);
  },
};
