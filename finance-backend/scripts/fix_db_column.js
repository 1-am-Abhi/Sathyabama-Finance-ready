const { sequelize } = require('../src/config/db');

async function fixColumn() {
  try {
    console.log('--- Step 1: Projects table ---');
    await sequelize.query('ALTER TABLE "Projects" ADD COLUMN IF NOT EXISTS "researchCenterId" UUID;');
    try {
        await sequelize.query('ALTER TABLE "Projects" ADD CONSTRAINT "fk_research_center_projects" FOREIGN KEY ("researchCenterId") REFERENCES "ResearchCenters"("_id") ON DELETE SET NULL;');
    } catch (e) { console.log('Constraint on Projects already exists or skipped.'); }

    console.log('--- Step 2: Users table ---');
    await sequelize.query('ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "researchCenterId" UUID;');
    try {
        await sequelize.query('ALTER TABLE "Users" ADD CONSTRAINT "fk_research_center_users" FOREIGN KEY ("researchCenterId") REFERENCES "ResearchCenters"("_id") ON DELETE SET NULL;');
    } catch (e) { console.log('Constraint on Users already exists or skipped.'); }

    console.log('--- Step 3: FundRequests table ---');
    await sequelize.query('ALTER TABLE "FundRequests" ADD COLUMN IF NOT EXISTS "researchCenterId" UUID;');
    try {
        await sequelize.query('ALTER TABLE "FundRequests" ADD CONSTRAINT "fk_research_center_fundrequests" FOREIGN KEY ("researchCenterId") REFERENCES "ResearchCenters"("_id") ON DELETE SET NULL;');
    } catch (e) { console.log('Constraint on FundRequests already exists or skipped.'); }

    console.log('Database schema fix completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Failed to fix database:', error.message);
    process.exit(1);
  }
}

fixColumn();
