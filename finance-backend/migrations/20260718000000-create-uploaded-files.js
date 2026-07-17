'use strict';

// Durable proof-file storage in Postgres. Render's disk is ephemeral, so
// local /uploads files vanished on redeploy (GET /uploads/<file> → 404). Storing
// the bytes here keeps bills/UCs previewable and downloadable across restarts.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('UploadedFiles', {
      filename: {
        type: Sequelize.STRING,
        primaryKey: true,
        allowNull: false,
      },
      mimetype: Sequelize.STRING,
      size: Sequelize.INTEGER,
      data: {
        type: Sequelize.BLOB('long'),
        allowNull: false,
      },
      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE,
    });
    console.log('✅ UploadedFiles table created');
  },

  async down(queryInterface) {
    await queryInterface.dropTable('UploadedFiles');
  },
};
