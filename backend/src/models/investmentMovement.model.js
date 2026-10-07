module.exports = (sequelize, DataTypes) => {
  const InvestmentMovement = sequelize.define(
    "InvestmentMovement",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      transaction_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
      },
      request_id: {
        type: DataTypes.STRING(64),
        allowNull: false,
      },
      type: {
        type: DataTypes.STRING(12),
        allowNull: false,
        validate: {
          isIn: [["contribution", "withdrawal"]],
        },
      },
      amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        validate: { min: 0.01 },
      },
      date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      description: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
    },
    {
      tableName: "investment_movements",
      underscored: true,
      timestamps: true,
    }
  );

  InvestmentMovement.associate = (models) => {
    InvestmentMovement.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "user",
    });
    InvestmentMovement.belongsTo(models.Transaction, {
      foreignKey: "transaction_id",
      as: "transaction",
    });
  };

  return InvestmentMovement;
};
