const { sequelize } = require('../src/config/db');

async function fixAll() {
  try {
    console.log('Adding id to AuditLogs...');
    await sequelize.query('ALTER TABLE "AuditLogs" ADD COLUMN IF NOT EXISTS "id" UUID;');
    console.log('Adding userId to AuditLogs...');
    await sequelize.query('ALTER TABLE "AuditLogs" ADD COLUMN IF NOT EXISTS "userId" UUID;');
    console.log('Adding action to AuditLogs...');
    await sequelize.query('ALTER TABLE "AuditLogs" ADD COLUMN IF NOT EXISTS "action" TEXT;');
    console.log('Adding entityType to AuditLogs...');
    await sequelize.query('ALTER TABLE "AuditLogs" ADD COLUMN IF NOT EXISTS "entityType" TEXT;');
    console.log('Adding entityId to AuditLogs...');
    await sequelize.query('ALTER TABLE "AuditLogs" ADD COLUMN IF NOT EXISTS "entityId" TEXT;');
    console.log('Adding metadata to AuditLogs...');
    await sequelize.query('ALTER TABLE "AuditLogs" ADD COLUMN IF NOT EXISTS "metadata" JSONB;');
    console.log('Adding createdAt to AuditLogs...');
    await sequelize.query('ALTER TABLE "AuditLogs" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP WITH TIME ZONE;');
    console.log('Adding approvedBy to Ledgers...');
    await sequelize.query('ALTER TABLE "Ledgers" ADD COLUMN IF NOT EXISTS "approvedBy" UUID;');
    console.log('Adding isHighValue to Ledgers...');
    await sequelize.query('ALTER TABLE "Ledgers" ADD COLUMN IF NOT EXISTS "isHighValue" BOOLEAN;');
    console.log('All missing columns added successfully.');
    process.exit(0);
  } catch (e) {
    console.error('Fix failed:', e.message);
    process.exit(1);
  }
}

fixAll();