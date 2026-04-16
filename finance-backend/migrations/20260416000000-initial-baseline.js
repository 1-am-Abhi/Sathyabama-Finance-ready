'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if table User exists first to make it non-destructive
    const tableExists = await queryInterface.sequelize.query(
      "SELECT to_regclass('public.Users');",
      { type: Sequelize.QueryTypes.SELECT }
    );
    
    // If it exists, this means the DB was seeded by sync(). Skip initial table creation.
    if (tableExists[0] && tableExists[0].to_regclass !== null) {
      console.log('Baseline database already established via sync(). Skipping first migration schema build...');
      return;
    }

    // Example Initial Table Structure for Baseline start in new DB
    await queryInterface.createTable('Users', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING
      },
      email: {
        type: Sequelize.STRING,
        unique: true
      },
      role: {
        type: Sequelize.STRING
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // NOTE: For full migration mapping, run sequelize-auto or create granular manual ADD COLUMN migrations 
    // moving forward as requested, preventing disruptive syncing.
  },

  async down(queryInterface, Sequelize) {
    // Safe teardown placeholder
    await queryInterface.dropTable('Users');
  }
};
