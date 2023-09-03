// src/seeders/[timestamp]-users.js

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) =>
    queryInterface.bulkInsert(
      'Users',
      [
        {
          fullName: 'Leonardo',
          email: 'leo@test.com',
          password: 'password',
        },
        {
          fullName: 'JEduardo',
          email: 'edu@test.com',
          password: 'password',
        },
      ],
      {}
    ),

  down: async (queryInterface) => queryInterface.bulkDelete('Users', null, {}),
};
