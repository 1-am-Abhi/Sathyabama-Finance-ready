'use strict';

module.exports = {
  async up(queryInterface) {
    try {
      const [tables] = await queryInterface.sequelize.query(`
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = current_schema()
          AND tablename = 'Installments'
      `);

      if (!tables.length) {
        console.log('⚠️ Installments table not found, skipping');
        return;
      }

      const [columns] = await queryInterface.sequelize.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'Installments'
          AND column_name IN ('projectId', 'installmentNumber')
      `);

      const colNames = columns.map(c => c.column_name);
      if (!colNames.includes('projectId') || !colNames.includes('installmentNumber')) {
        console.log('⚠️ Required columns missing, skipping constraint');
        return;
      }

      const [constraints] = await queryInterface.sequelize.query(`
        SELECT conname
        FROM pg_constraint
        WHERE conname = 'uq_project_installment'
      `);

      if (constraints.length) {
        console.log('⚠️ Constraint already exists, skipping');
        return;
      }

      await queryInterface.sequelize.query(`
        ALTER TABLE "Installments"
        ADD CONSTRAINT "uq_project_installment"
        UNIQUE ("projectId", "installmentNumber");
      `);

      console.log('✅ Unique constraint added');
    } catch (err) {
      console.log('⚠️ Migration safely skipped:', err.message);
    }
  },

  async down(queryInterface) {
    try {
      await queryInterface.sequelize.query(`
        ALTER TABLE "Installments"
        DROP CONSTRAINT IF EXISTS "uq_project_installment";
      `);
    } catch (err) {
      console.log('⚠️ rollback skipped:', err.message);
    }
  }
};
