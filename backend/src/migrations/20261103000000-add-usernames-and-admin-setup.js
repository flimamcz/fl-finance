"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("users", "username", {
      type: Sequelize.STRING(30),
      allowNull: true,
    });
    await queryInterface.addColumn("users", "is_admin", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    const [users] = await queryInterface.sequelize.query(
      "SELECT id FROM users ORDER BY id"
    );
    for (const user of users) {
      await queryInterface.bulkUpdate(
        "users",
        { username: `legacy_${user.id}` },
        { id: user.id }
      );
    }

    await queryInterface.changeColumn("users", "username", {
      type: Sequelize.STRING(30),
      allowNull: false,
    });
    await queryInterface.addIndex("users", ["username"], {
      unique: true,
      name: "users_username_unique",
    });

    await queryInterface.createTable("system_settings", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        allowNull: false,
      },
      admin_setup_complete: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    });

    const [adminCountRows] = await queryInterface.sequelize.query(
      "SELECT COUNT(*) AS admin_count FROM users WHERE is_admin = true"
    );
    const setupComplete = Number(adminCountRows[0].admin_count) > 0;
    await queryInterface.bulkInsert("system_settings", [
      { id: 1, admin_setup_complete: setupComplete },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("system_settings");
    await queryInterface.removeIndex("users", "users_username_unique");
    await queryInterface.removeColumn("users", "is_admin");
    await queryInterface.removeColumn("users", "username");
  },
};
