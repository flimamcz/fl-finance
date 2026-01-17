// migrations/[timestamp]-add-category-id-to-transactions.js
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('transactions', 'category_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: 'type_id'
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('transactions', 'category_id');
  }
};