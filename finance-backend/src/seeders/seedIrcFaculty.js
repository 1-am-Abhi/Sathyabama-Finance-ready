'use strict';

/**
 * IRC Faculty master-data seed.
 *
 * Source of truth: src/data/ircFaculty.json (generated from the official
 * "IRC Faculty Details" Excel — trimmed, de-duplicated, dates normalised).
 *
 * Idempotent: hubs are upserted by `code`, faculty by `employeeId` (ERP) with a
 * fallback to `email`. Re-running never creates duplicates.
 *
 * DESTRUCTIVE RESET is opt-in via env SEED_RESET=1 (or the reset() export). It
 * deletes ALL old faculty + the transactional data that references them
 * (projects, fund requests, disbursements, project members, faculty
 * notifications) and old research centres — but PRESERVES system roles
 * (ADMIN / FINANCE_OFFICER / AUDITOR). It never runs unless explicitly requested.
 */

const path = require('path');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

const DEFAULT_PASSWORD = 'Sathyabama@2026';
const PRESERVED_ROLES = ['ADMIN', 'FINANCE_OFFICER', 'AUDITOR'];

const loadData = () => {
  // eslint-disable-next-line import/no-dynamic-require, global-require
  return require(path.join(__dirname, '..', 'data', 'ircFaculty.json'));
};

/**
 * Delete old faculty-dependent master + transactional data. Preserves system
 * accounts. Best-effort per table (a missing model/table is skipped, not fatal).
 */
async function resetMasterData(models) {
  const {
    Disbursement, FundRequest, ProjectMember, Project, Notification,
    User, ResearchCenter,
  } = models;

  const del = async (model, where, label) => {
    if (!model) return 0;
    try {
      const n = await model.destroy({ where: where || {}, force: true });
      logger.info(`[seedIrcFaculty] reset: deleted ${n} ${label}`);
      return n;
    } catch (e) {
      logger.warn(`[seedIrcFaculty] reset: could not clear ${label}: ${e.message}`);
      return 0;
    }
  };

  // Order matters for FK safety: leaves → roots.
  await del(Disbursement, null, 'disbursements');
  await del(FundRequest, null, 'fund requests');
  await del(ProjectMember, null, 'project members');
  await del(Project, null, 'projects');
  // Notifications belonging to non-system users (faculty) — keep system ones.
  if (Notification && User) {
    try {
      const systemUsers = await User.findAll({
        where: { role: { [Op.in]: PRESERVED_ROLES } }, attributes: ['_id'],
      });
      const systemIds = systemUsers.map((u) => u._id);
      await Notification.destroy({
        where: systemIds.length ? { userId: { [Op.notIn]: systemIds } } : {},
        force: true,
      });
    } catch (e) {
      logger.warn(`[seedIrcFaculty] reset: notifications cleanup failed: ${e.message}`);
    }
  }
  // Faculty (and any non-system) users — preserve Admin / Finance / Auditor.
  await del(User, { role: { [Op.notIn]: PRESERVED_ROLES } }, 'non-system users (faculty)');
  await del(ResearchCenter, null, 'research centres');
}

/** Upsert research hubs (ResearchCenter) by code. Returns code → row map. */
async function seedHubs(models, hubs) {
  const { ResearchCenter } = models;
  const byCode = {};
  for (const hub of hubs) {
    const [row] = await ResearchCenter.findOrCreate({
      where: { code: hub.code },
      defaults: { code: hub.code, name: hub.name },
    });
    if (row.name !== hub.name) { row.name = hub.name; await row.save(); }
    byCode[hub.code] = row;
  }
  return byCode;
}

/** Upsert faculty users by employeeId (ERP) → email fallback. */
async function seedFaculty(models, faculty, hubsByCode) {
  const { User } = models;
  let created = 0; let updated = 0;
  const byCategory = {}; const byDesignation = {};

  for (const f of faculty) {
    const hub = hubsByCode[f.hubCode];
    const education = [
      f.pgDegree ? { level: 'PG', degree: f.pgDegree, specialization: f.pgSpecialization || null } : null,
      f.phd ? { level: 'PhD', area: f.phd } : null,
    ].filter(Boolean);

    const fields = {
      name: f.name,
      email: f.email,
      role: 'FACULTY',
      organizationId: 'ORG_1',
      employeeId: f.employeeId || null,
      phone: f.phone || null,
      department: hub ? hub.name : f.hubName,        // department = hub full name
      centre: hub ? hub.name : f.hubName,            // display name
      centreId: hub ? hub._id : null,
      researchCenterId: hub ? hub._id : null,
      designation: f.designation || null,
      designationCategory: f.designationCategory || 'FACULTY',
      joiningDate: f.joiningDate || null,
      specialization: f.pgSpecialization || f.phd || null,
      bio: f.phd ? `Ph.D. — ${f.phd}` : null,
      education,
      status: 'Active',
    };

    // Find existing by ERP first, then email.
    let user = null;
    if (f.employeeId) user = await User.findOne({ where: { employeeId: f.employeeId } });
    if (!user) user = await User.findOne({ where: { email: f.email } });

    if (user) {
      Object.assign(user, fields);
      // Only (re)set the default password when it isn't already set to avoid
      // re-hashing on every run; a reset run starts from a clean slate → create path.
      await user.save();
      updated += 1;
    } else {
      user = await User.create({ ...fields, password: DEFAULT_PASSWORD }); // hook hashes
      created += 1;
    }

    const cat = fields.designationCategory;
    byCategory[cat] = (byCategory[cat] || 0) + 1;
    const des = fields.designation || '(none)';
    byDesignation[des] = (byDesignation[des] || 0) + 1;
  }

  return { created, updated, byCategory, byDesignation };
}

/**
 * Run the seed. opts.reset (or env SEED_RESET=1) performs the destructive wipe
 * first. Returns a structured report.
 */
async function run(opts = {}) {
  const models = require('../models');
  const data = loadData();
  const doReset = opts.reset || process.env.SEED_RESET === '1' || process.env.SEED_RESET === 'true';

  if (doReset) {
    logger.warn('[seedIrcFaculty] SEED_RESET enabled — clearing old master + dependent data');
    await resetMasterData(models);
  }

  const hubsByCode = await seedHubs(models, data.hubs);
  const facultyResult = await seedFaculty(models, data.faculty, hubsByCode);

  const report = {
    reset: !!doReset,
    hubs: data.hubs.length,
    departments: data.hubs.length, // departments are the research hubs in this dataset
    facultyImported: facultyResult.created + facultyResult.updated,
    facultyCreated: facultyResult.created,
    facultyUpdated: facultyResult.updated,
    scientificAssistants: facultyResult.byDesignation['Scientific Assistant'] || 0,
    seniorScientificAssistants: facultyResult.byDesignation['Senior Scientific Assistant'] || 0,
    professors: facultyResult.byDesignation['Professor (Research)'] || 0,
    associateProfessors: facultyResult.byDesignation['Associate Professor (Research)'] || 0,
    assistantProfessors: facultyResult.byDesignation['Assistant Professor (Research)'] || 0,
    duplicatesSkipped: (data.meta && data.meta.skipped ? data.meta.skipped.length : 0),
    invalidRows: (data.meta && data.meta.invalid ? data.meta.invalid : []),
    byCategory: facultyResult.byCategory,
  };
  return report;
}

module.exports = { run, resetMasterData, seedHubs, seedFaculty, DEFAULT_PASSWORD };

// CLI: `node src/seeders/seedIrcFaculty.js`  (add SEED_RESET=1 to wipe first)
if (require.main === module) {
  (async () => {
    const { connectDB } = require('../config/db');
    await new Promise((resolve) => connectDB(resolve));
    try {
      const report = await run();
      console.log('\n===== IRC FACULTY IMPORT REPORT =====');
      console.log(JSON.stringify(report, null, 2));
      process.exit(0);
    } catch (e) {
      console.error('[seedIrcFaculty] FAILED:', e);
      process.exit(1);
    }
  })();
}
