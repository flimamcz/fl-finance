"use strict";

module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    "SystemSetting",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false,
      },
      adminSetupComplete: {
        field: "admin_setup_complete",
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      tableName: "system_settings",
      timestamps: false,
    }
  );
