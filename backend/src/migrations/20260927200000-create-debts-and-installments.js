module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("debts", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      user_id: {
        allowNull: false,
        type: Sequelize.INTEGER,
      },
      name: {
        allowNull: false,
        type: Sequelize.STRING(120),
      },
      creditor: {
        allowNull: true,
        type: Sequelize.STRING(120),
      },
      amount: {
        allowNull: false,
        type: Sequelize.DECIMAL(12, 2),
      },
      first_due_date: {
        allowNull: false,
        type: Sequelize.DATEONLY,
      },
      recurring: {
        allowNull: false,
        defaultValue: false,
        type: Sequelize.BOOLEAN,
      },
      installment_count: {
        allowNull: false,
        defaultValue: 1,
        type: Sequelize.INTEGER,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn("NOW"),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn("NOW"),
      },
    });

    await queryInterface.createTable("debt_installments", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      debt_id: {
        allowNull: false,
        type: Sequelize.INTEGER,
        references: { model: "debts", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      installment_number: {
        allowNull: false,
        type: Sequelize.INTEGER,
      },
      due_date: {
        allowNull: false,
        type: Sequelize.DATEONLY,
      },
      amount: {
        allowNull: false,
        type: Sequelize.DECIMAL(12, 2),
      },
      status: {
        allowNull: false,
        defaultValue: "pending",
        type: Sequelize.STRING(12),
      },
      transaction_id: {
        allowNull: true,
        unique: true,
        type: Sequelize.INTEGER,
      },
      paid_at: {
        allowNull: true,
        type: Sequelize.DATE,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn("NOW"),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn("NOW"),
      },
    });

    await queryInterface.addConstraint("debt_installments", {
      fields: ["debt_id", "installment_number"],
      type: "unique",
      name: "debt_installments_debt_number_unique",
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("debt_installments");
    await queryInterface.dropTable("debts");
  },
};