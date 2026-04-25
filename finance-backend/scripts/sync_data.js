const { sequelize } = require('../src/config/db');

const CENTRE_MAP = {
    CCCS: "Centre for Computational and Communication Sciences",
    CDDD: "Centre for Drug Discovery and Development",
    CNSNT: "Centre for Nanoscience and Nanotechnology",
    CWM: "Centre for Waste Management",
    CEER: "Centre for Energy and Environmental Research",
    CEAM: "Centre for Advanced Materials",
    CMNS: "Centre for Molecular and Nanomedical Sciences",
};

async function syncData() {
  try {
    console.log('Step 1: Populating codes in ResearchCenters...');
    for (const [code, name] of Object.entries(CENTRE_MAP)) {
        await sequelize.query(`
            UPDATE "ResearchCenters"
            SET "code" = :code
            WHERE "name" ILIKE :name
        `, {
            replacements: { 
                code, 
                name: `%${name.replace('Centre for ', '').replace('Centre of Excellence for ', '').trim()}%`
            }
        });
    }
    await sequelize.query(`UPDATE "ResearchCenters" SET "code" = 'OTHERS' WHERE "name" = 'Others'`);

    console.log('Step 2: Syncing Projects...');
    await sequelize.query(`
      UPDATE "Projects"
      SET "researchCenterId" = (
        SELECT "_id" FROM "ResearchCenters"
        WHERE "ResearchCenters"."code" = "Projects"."centre"
           OR "ResearchCenters"."name" = "Projects"."centre"
        LIMIT 1
      ) WHERE "researchCenterId" IS NULL;
    `);

    console.log('Step 3: Syncing Users...');
    await sequelize.query(`
      UPDATE "Users"
      SET "researchCenterId" = (
        SELECT "_id" FROM "ResearchCenters"
        WHERE "ResearchCenters"."code" = "Users"."centre"
           OR "ResearchCenters"."name" = "Users"."centre"
        LIMIT 1
      ) WHERE "researchCenterId" IS NULL;
    `);

    console.log('Step 4: Syncing FundRequests...');
    await sequelize.query(`
      UPDATE "FundRequests"
      SET "researchCenterId" = (
        SELECT "_id" FROM "ResearchCenters"
        WHERE "ResearchCenters"."code" = "FundRequests"."centre"
           OR "ResearchCenters"."name" = "FundRequests"."centre"
        LIMIT 1
      ) WHERE "researchCenterId" IS NULL;
    `);

    console.log('Step 5: Fallback to Project researchCenterId for FundRequests...');
    await sequelize.query(`
      UPDATE "FundRequests"
      SET "researchCenterId" = (
        SELECT "researchCenterId" FROM "Projects"
        WHERE "Projects"."_id" = "FundRequests"."projectId"
        LIMIT 1
      ) WHERE "researchCenterId" IS NULL;
    `);

    console.log('Step 6: Link unmatched records to "Others"...');
    const [others] = await sequelize.query(`SELECT "_id" FROM "ResearchCenters" WHERE "name" = 'Others' LIMIT 1`);
    if (others && others[0]) {
        const othersId = others[0]._id;
        await sequelize.query(`UPDATE "Projects" SET "researchCenterId" = :othersId WHERE "researchCenterId" IS NULL AND "centre" IS NOT NULL`, { replacements: { othersId } });
        await sequelize.query(`UPDATE "Users" SET "researchCenterId" = :othersId WHERE "researchCenterId" IS NULL AND "centre" IS NOT NULL`, { replacements: { othersId } });
        await sequelize.query(`UPDATE "FundRequests" SET "researchCenterId" = :othersId WHERE "researchCenterId" IS NULL AND "centre" IS NOT NULL`, { replacements: { othersId } });
    }

    console.log('Data sync completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Failed to sync data:', error.message);
    process.exit(1);
  }
}

syncData();
