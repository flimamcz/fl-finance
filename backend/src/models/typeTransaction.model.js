const typeTransactionModel = (sequelize, DataTypes) => {
  const typeTransaction = sequelize.define(
    "typeTransaction",
    {
      typeId: {
        allowNull: false,
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        field: "type_id",
      },
      
      type: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    { underscored: true, timestamps: false }
  );

  return typeTransaction;
};

module.exports = typeTransactionModel;
