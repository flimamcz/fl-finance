const typeTransactionModel = (sequelize, DataTypes) => {
  const Type = sequelize.define(
    "Type",
    {
      id: {
        allowNull: false,
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      type: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    { underscored: false, timestamps: false }
  );

  return Type;
};

module.exports = typeTransactionModel;
