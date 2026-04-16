/**
 * Migration: Add installmentNumber to FundRequests
 *
 * Run this ONCE against the production database if the column does not exist.
 * Safe to run multiple times — it checks before adding.
 *
 * Usage:
 *   NODE_ENV=production node finance-backend/migrations/add_installment_number.js
 */
const path = require('path');
const fs   = require('fs');
const dotenv = require('dotenv');

// Load env: prefer .env.production, fall back to .env
const prodEnv = path.join(__dirname, '../.env.production');
const rootEnv = path.join(__dirname, '../.env');
dotenv.config({ path: fs.existsSync(prodEnv) ? prodEnv : rootEnv });

const { sequelize } = require('../src/config/db');

(async () => {
    const qi = sequelize.getQueryInterface();

    // ── Check if column already exists ────────────────────────────────────────
    const tableDesc = await qi.describeTable('FundRequests').catch(() => null);
    if (!tableDesc) {
        console.error('❌  FundRequests table not found. Is the DB running?');
        process.exit(1);
    }

    if (tableDesc.installmentNumber) {
        console.log('ℹ️   Column installmentNumber already exists — nothing to do.');
        await sequelize.close();
        return;
    }

    // ── Add column with safe default ──────────────────────────────────────────
    const { DataTypes } = require('sequelize');
    await qi.addColumn('FundRequests', 'installmentNumber', {
        type:         DataTypes.INTEGER,
        allowNull:    false,
        defaultValue: 1,
        comment:      'Sequential installment number per project (1, 2, 3…)'
    });

    console.log('✅  Column installmentNumber added to FundRequests successfully.');

    // ── Back-fill existing rows: number them per project chronologically ───────
    console.log('⏳  Back-filling installmentNumber for existing rows…');
    const [results] = await sequelize.query(`
        SELECT "_id", "projectId", "createdAt"
        FROM "FundRequests"
        ORDER BY "projectId", "createdAt" ASC
    `);

    const counters = {};
    for (const row of results) {
        const key = row.projectId || '__no_project__';
        counters[key] = (counters[key] || 0) + 1;
        await sequelize.query(
            `UPDATE "FundRequests" SET "installmentNumber" = :num WHERE "_id" = :id`,
            { replacements: { num: counters[key], id: row._id } }
        );
    }

    console.log(`✅  Back-filled installmentNumber for ${results.length} existing rows.`);
    await sequelize.close();
})().catch((err) => {
    console.error('❌  Migration failed:', err.message);
    process.exit(1);
});
