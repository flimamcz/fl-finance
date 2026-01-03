// src/models/transaction.model.js - VERSÃO SIMPLIFICADA
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

      // ✅ Campo userId (sem referência por enquanto)
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: true, // ✅ NULLABLE por enquanto
        field: "user_id"
        // ❌ Remova a referência por enquanto:
        // references: {
        //   model: 'users',
        //   key: 'id'
        // }
      },

      description: {
        allowNull: false,
        type: DataTypes.STRING,
      },

      date: {
        type: DataTypes.STRING,
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

  // ❌ REMOVA TODO O BLOCO associate POR ENQUANTO
  // Transaction.associate = (models) => {
  //   Transaction.belongsTo(models.User, {
  //     foreignKey: 'user_id',
  //     as: 'user'
  //   });
  //   
  //   Transaction.belongsTo(models.TypeTransaction, {
  //     foreignKey: 'type_id',
  //     as: 'type'
  //   });
  // };

  return Transaction;
};

module.exports = transactionModel;