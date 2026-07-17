'use strict';

// Durable proof-file storage in Postgres. Render's disk is ephemeral, so
// local /uploads files vanished on redeploy (GET /uploads/<file> → 404). Storing
// the bytes here keeps bills/UCs previewable and downloadable across restarts.
module.exports = {
  async up(queryInterface, Sequelize) {
    // Idempotent: never fail the deploy if the table already exists (e.g. created
    // by the defensive startup sync). startCommand is `npm run migrate && npm
    // start`, so a throw here would abort the whole boot.
    const tables = await queryInterface.showAllTables();
    if (tables.map((t) => String(t).toLowerCase()).includes('uploadedfiles')) {
      console.log('ℹ️ UploadedFiles already exists — skipping create');
      return;
    }
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
