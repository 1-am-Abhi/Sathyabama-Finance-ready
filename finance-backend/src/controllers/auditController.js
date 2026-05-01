const { AuditLog } = require("../models");
const asyncHandler = require("../utils/asyncHandler");
const crypto = require('crypto');
const { Parser } = require('json2csv');
const {
  getBudgetForecast,
  getBudgetAlerts,
  detectAnomalies,
  getTopSpendProjects,
} = require('../services/budgetService');

const getAuditTimeline = asyncHandler(async (req, res) => {
    const { requestId } = req.params;

    const logs = await AuditLog.findAll({
        where: { entityId: requestId },
        order: [["createdAt", "ASC"]],
    });

    const enriched = logs.map(log => ({
      ...log.toJSON(),
      amount: log.meta?.amount || log.metadata?.amount || null,
    }));

    res.json({ success: true, data: enriched });
});

/**
 * GET /audit/logs/export
 * Exports all audit logs for the organization as JSON (AUDITOR-accessible).
 */
const exportAuditLogs = asyncHandler(async (req, res) => {
  const where = { organizationId: req.user.organizationId };

  const logs = await AuditLog.findAll({
    where,
    order: [['createdAt', 'DESC']],
  });

  const data = logs.map(l => ({
    Action: l.action,
    EntityType: l.entityType,
    EntityId: l.entityId,
    UserId: l.userId,
    Timestamp: l.createdAt,
    Metadata: JSON.stringify(l.metadata || {}),
  }));

  const format = req.query.format || 'json';

  if (format === 'csv') {
    const parser = new Parser();
    const csv = parser.parse(data);
    res.header('Content-Type', 'text/csv');
    res.attachment('audit-logs.csv');
    return res.send(csv);
  }

  return res.json({ success: true, total: data.length, data });
});

/**
 * GET /audit/budget/:projectId/forecast
 */
const budgetForecast = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const forecast = await getBudgetForecast(projectId);
  res.json({ success: true, data: forecast });
});

/**
 * GET /audit/budget/:projectId/alerts
 */
const budgetAlerts = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const result = await getBudgetAlerts(projectId);
  res.json({ success: true, data: result });
});

/**
 * GET /audit/anomalies/:projectId
 */
const anomalyDetection = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const flags = await detectAnomalies(projectId);
  res.json({ success: true, flags, flagCount: flags.length });
});

/**
 * GET /audit/verify/:id
 * Verifies the integrity of an audit log entry by recalculating its hash.
 */
const verifyAuditLog = asyncHandler(async (req, res) => {
    const log = await AuditLog.findByPk(req.params.id);
    if (!log) {
        return res.status(404).json({ success: false, message: 'Audit log not found' });
    }

    if (!log.hash) {
        return res.json({ 
            success: true, 
            valid: false, 
            message: 'Audit log does not contain a signature (Legacy record)' 
        });
    }

    const recalculated = crypto
        .createHash('sha256')
        .update(JSON.stringify(log.metadata))
        .digest('hex');

    const isValid = recalculated === log.hash;

    res.json({
        success: true,
        id: log.id,
        valid: isValid,
        recalculatedHash: recalculated,
        storedHash: log.hash
    });
});

const safe = require('../utils/safeController');

const topSpendProjects = safe(async (req, res) => {
  const results = await getTopSpendProjects(req.user.organizationId);
  return results;
});

module.exports = {
  getAuditTimeline,
  exportAuditLogs,
  verifyAuditLog,
  budgetForecast,
  budgetAlerts,
  anomalyDetection,
  topSpendProjects,
};
