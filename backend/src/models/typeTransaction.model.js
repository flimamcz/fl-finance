const typeTransactionModel = (sequelize, DataTypes) => {
  const typeTransaction = sequelize.define("typeTransaction", {
    type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  });

  return typeTransaction;
};

module.exports = typeTransactionModel;
