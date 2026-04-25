const { sequelize } = require('./src/config/db');

async function fixColumn() {
  try {
    console.log('Adding researchCenterId column to Projects table...');
    // Use IF NOT EXISTS to avoid errors if the column was already added
    await sequelize.query('ALTER TABLE "Projects" ADD COLUMN IF NOT EXISTS "researchCenterId" UUID;');
    
    console.log('Adding foreign key constraint...');
    try {
        await sequelize.query('ALTER TABLE "Projects" ADD CONSTRAINT "fk_research_center" FOREIGN KEY ("researchCenterId") REFERENCES "ResearchCenters"("_id") ON DELETE SET NULL;');
    } catch (e) {
        if (e.name === 'SequelizeDatabaseError' && e.message.includes('already exists')) {
            console.log('Constraint already exists, skipping.');
        } else {
            console.warn('Foreign key constraint could not be added (it might already exist or the table structure is slightly different):', e.message);
        }
    }
    
    console.log('Database fix completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Failed to fix database:', error.message);
    process.exit(1);
  }
}

fixColumn();
