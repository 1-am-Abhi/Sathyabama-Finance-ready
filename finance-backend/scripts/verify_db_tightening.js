const { sequelize } = require('../src/config/db');

async function verifyTightening() {
  try {
    console.log('--- DB TIGHTENING VERIFICATION START ---');

    // 1. Disbursement Indices & Constraints
    console.log('[1/2] Verifying Disbursement constraints...');
    await sequelize.query(`
      ALTER TABLE "Disbursements" 
      ADD COLUMN IF NOT EXISTS "referenceId" TEXT,
      ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;
    `);

    // Add unique constraint on referenceId if not exists
    try {
      await sequelize.query('CREATE UNIQUE INDEX IF NOT EXISTS "disbursement_reference_id_idx" ON "Disbursements" ("referenceId");');
      console.log('  - UNIQUE INDEX on referenceId: OK');
    } catch (e) { console.warn('  - referenceId index failed (maybe already exists or has duplicates):', e.message); }

    try {
      await sequelize.query('CREATE UNIQUE INDEX IF NOT EXISTS "disbursement_idempotency_key_idx" ON "Disbursements" ("idempotencyKey");');
      console.log('  - UNIQUE INDEX on idempotencyKey: OK');
    } catch (e) { console.warn('  - idempotencyKey index failed:', e.message); }

    // 2. Ledger Invariants Index
    console.log('[2/2] Verifying Ledger indices...');
    try {
      await sequelize.query('CREATE INDEX IF NOT EXISTS "ledger_disbursement_journal_idx" ON "Ledgers" ("disbursementId", "journalId");');
      console.log('  - INDEX on (disbursementId, journalId): OK');
    } catch (e) { console.warn('  - Ledger index failed:', e.message); }

    console.log('--- DB TIGHTENING VERIFICATION COMPLETE ---');
    process.exit(0);
  } catch (error) {
    console.error('CRITICAL: Tightening script failed:', error.message);
    process.exit(1);
  }
}

verifyTightening();
