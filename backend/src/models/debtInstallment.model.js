module.exports = (sequelize, DataTypes) => {
  const DebtInstallment = sequelize.define(
    "DebtInstallment",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      debt_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      installment_number: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      due_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING(12),
        allowNull: false,
        defaultValue: "pending",
      },
      transaction_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        unique: true,
      },
      paid_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      underscored: true,
      timestamps: true,
      tableName: "debt_installments",
    }
  );

  DebtInstallment.associate = (models) => {
    DebtInstallment.belongsTo(models.Debt, {
      foreignKey: "debt_id",
      as: "debt",
    });
  };

  return DebtInstallment;
};