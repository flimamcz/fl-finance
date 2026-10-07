// src/models/transaction.model.js - COMPLETO COM ASSOCIAÇÃO
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
      isSalary: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: "is_salary",
      },
      category_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "category_id"
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "user_id"
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

  // 🔥 ASSOCIAÇÃO COM CATEGORIA
  Transaction.associate = (models) => {
    Transaction.belongsTo(models.Category, {
      foreignKey: 'category_id',
      as: 'category'
    });
    Transaction.hasOne(models.InvestmentMovement, {
      foreignKey: "transaction_id",
      as: "investmentMovement",
    });
  };

  return Transaction;
};

module.exports = transactionModel;