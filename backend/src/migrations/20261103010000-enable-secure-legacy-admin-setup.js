"use strict";

module.exports = {
  async up(queryInterface) {
    const [adminCountRows] = await queryInterface.sequelize.query(
      "SELECT COUNT(*) AS admin_count FROM users WHERE is_admin = true"
    );
    const setupComplete = Number(adminCountRows[0].admin_count) > 0;

    await queryInterface.bulkUpdate(
      "system_settings",
      { admin_setup_complete: setupComplete },
      { id: 1 }
    );
  },

  async down() {},
};
