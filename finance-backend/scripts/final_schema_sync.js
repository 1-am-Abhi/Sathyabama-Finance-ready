const { sequelize } = require('../src/config/db');

async function ensureTables() {
  try {
    console.log('Ensuring all core tables exist...');
    
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "AuditLogs" (
        "id" UUID PRIMARY KEY,
        "userId" UUID NOT NULL,
        "action" TEXT NOT NULL,
        "entityType" TEXT NOT NULL,
        "entityId" TEXT NOT NULL,
        "metadata" JSONB,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL
      );
    `);
    console.log('AuditLogs table verified/created.');

    // Also check Ledgers missing columns
    await sequelize.query('ALTER TABLE "Ledgers" ADD COLUMN IF NOT EXISTS "approvedBy" UUID;');
    await sequelize.query('ALTER TABLE "Ledgers" ADD COLUMN IF NOT EXISTS "isHighValue" BOOLEAN DEFAULT FALSE;');
    console.log('Ledgers columns verified/added.');

    console.log('All missing tables and columns resolved.');
    process.exit(0);
  } catch (error) {
    console.error('Failed to ensure tables:', error.message);
    process.exit(1);
  }
}

ensureTables();
