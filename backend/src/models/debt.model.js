module.exports = (sequelize, DataTypes) => {
  const Debt = sequelize.define(
    "Debt",
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
      name: {
        type: DataTypes.STRING(120),
        allowNull: false,
      },
      creditor: {
        type: DataTypes.STRING(120),
        allowNull: true,
      },
      amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
      },
      first_due_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      recurring: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      installment_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
    },
    {
      underscored: true,
      timestamps: true,
      tableName: "debts",
    }
  );

  Debt.associate = (models) => {
    Debt.hasMany(models.DebtInstallment, {
      foreignKey: "debt_id",
      as: "installments",
    });
  };

  return Debt;
};