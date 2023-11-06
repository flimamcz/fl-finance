const transactionModel = (sequelize, DataTypes) => {
  const Transaction = sequelize.define(
    "Transaction",
    {
      id: {
        allowNull: false,
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      value: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      typeId: {
        type: DataTypes.INTEGER,
        foreignKey: true,
        field: "type_id",
      },

      description: {
        allowNull: false,
        type: DataTypes.STRING,
      },

      date: {
        type: DataTypes.DATE,
        allowNull: false,
      },

      status: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
      },
    },
    {
      underscored: true,
      timestamps: false,
    }
  );

  return Transaction;
};

module.exports = transactionModel;
