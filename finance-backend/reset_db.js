/**
 * reset_db.js
 * Safely truncates all transactional tables while preserving:
 *   - Users
 *   - Centres
 *   - Migrations table
 *
 * Usage: node reset_db.js
 */
const { sequelize } = require('./src/config/db');

const TABLES_TO_CLEAR = [
    // Dependent first, then parents
    'Disbursements',
    'Notifications',
    'AcademicMetrics',
    'Documents',
    'FundRequests',
    'FacultyRequests',
    'ODRequests',
    'EventRequests',
    'EquipmentRequests',
    'ProjectMembers',
    'Revenues',
    'InternshipFees',
    'PFMSTransactions',
    'Ledgers',
    'AuditLogs',
    'Projects',
    'FundSources',
];

const resetDB = async () => {
    try {
        console.log('Starting DB reset...\n');

        for (const table of TABLES_TO_CLEAR) {
            try {
                await sequelize.query(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE;`);
                console.log(`  ✓ ${table}`);
            } catch (err) {
                if (err.message.includes('does not exist')) {
                    console.warn(`  ⚠ Skipping "${table}" — table does not exist`);
                } else {
                    console.error(`  ✗ Failed "${table}": ${err.message}`);
                }
            }
        }

        console.log('\n✅ DB reset complete.');
        console.log('   ↳ Users and Centres are preserved.');
        console.log('   ↳ Dashboard should now show ₹0 and empty tables.');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Reset failed:', error.message);
        process.exit(1);
    }
};

resetDB();
