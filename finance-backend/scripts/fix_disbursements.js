const { sequelize } = require('../src/config/db');

async function fixDisbursements() {
  try {
    console.log('Updating Disbursements table schema...');
    
    await sequelize.query('ALTER TABLE "Disbursements" ADD COLUMN IF NOT EXISTS "installmentNumber" INTEGER;');
    await sequelize.query('ALTER TABLE "Disbursements" ADD COLUMN IF NOT EXISTS "isInstallment" BOOLEAN DEFAULT FALSE;');
    await sequelize.query('ALTER TABLE "Disbursements" ADD COLUMN IF NOT EXISTS "isHighValue" BOOLEAN DEFAULT FALSE;');
    await sequelize.query('ALTER TABLE "Disbursements" ADD COLUMN IF NOT EXISTS "approvedBy" UUID;');
    await sequelize.query('ALTER TABLE "Disbursements" ADD COLUMN IF NOT EXISTS "approvedByName" VARCHAR(255);');
    await sequelize.query('ALTER TABLE "Disbursements" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP WITH TIME ZONE;');
    
    console.log('Disbursements table fix completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Failed to fix Disbursements table:', error.message);
    process.exit(1);
  }
}

fixDisbursements();
