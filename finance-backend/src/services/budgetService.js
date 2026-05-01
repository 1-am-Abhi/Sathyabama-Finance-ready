const { Disbursement, FundRequest, Project } = require('../models');
const { Op } = require('sequelize');

/**
 * Returns avg spend and projected next installment for a given project.
 */
exports.getBudgetForecast = async (projectId) => {
  const disbursements = await Disbursement.findAll({
    where: { projectId },
  });

  const total = disbursements.reduce((sum, d) => sum + Number(d.amount), 0);
  const avg = disbursements.length ? total / disbursements.length : 0;

  return {
    avgSpend: avg,
    projectedNext: avg * 1.2,
    totalDisbursed: total,
    disbursementCount: disbursements.length,
  };
};

/**
 * Returns budget utilization % and alert flags for a project.
 */
exports.getBudgetAlerts = async (projectId) => {
  const project = await Project.findByPk(projectId);
  if (!project) return { alerts: ['Project not found'] };

  const sanctioned = Number(project.sanctionedBudget || 0);
  const disbursements = await Disbursement.findAll({ where: { projectId } });

  const total = disbursements.reduce((sum, d) => sum + Number(d.amount), 0);
  const utilized = sanctioned > 0 ? (total / sanctioned) * 100 : 0;

  const alerts = [];

  if (total > sanctioned * 0.9) {
    alerts.push('⚠ Budget nearing exhaustion');
  }

  if (total >= sanctioned) {
    alerts.push('🚨 Budget fully exhausted');
  }

  return {
    sanctioned,
    totalDisbursed: total,
    utilizationPercent: Math.min(utilized, 100).toFixed(2),
    alerts,
  };
};

/**
 * Deterministic fraud / anomaly detection on disbursements.
 * No ML — rule-based checks only.
 */
exports.detectAnomalies = async (projectId) => {
  const disbursements = await Disbursement.findAll({
    where: { projectId },
    order: [['createdAt', 'ASC']],
  });

  const flags = [];

  for (let i = 0; i < disbursements.length; i++) {
    const d = disbursements[i];
    const amount = Number(d.amount);

    // High-value transaction
    if (amount > 1000000) {
      flags.push({
        id: d._id || d.id,
        flag: '🚨 High-value transaction',
        amount,
        date: d.createdAt,
      });
    }

    // Rapid repeated disbursement (within 1 day of previous)
    if (i > 0) {
      const prev = disbursements[i - 1];
      const gapMs = new Date(d.createdAt) - new Date(prev.createdAt);
      const gapHours = gapMs / (1000 * 60 * 60);

      if (gapHours < 24) {
        flags.push({
          id: d._id || d.id,
          flag: '⚠ Rapid repeated disbursement',
          gapHours: gapHours.toFixed(2),
          date: d.createdAt,
        });
      }
    }
  }

  return flags;
};

/**
 * Top 5 highest-spend projects (org-wide).
 */
exports.getTopSpendProjects = async (organizationId) => {
  const where = organizationId ? { organizationId } : {};

  const projects = await Project.findAll({ where });
  const results = [];

  for (const p of projects) {
    const disbursements = await Disbursement.findAll({
      where: { projectId: p._id || p.id, organizationId },
    });
    const total = disbursements.reduce((sum, d) => sum + Number(d.amount), 0);
    results.push({ project: p.title, total });
  }

  return results
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
};
