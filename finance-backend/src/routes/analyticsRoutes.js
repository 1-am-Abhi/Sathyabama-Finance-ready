const express = require('express');
const router = express.Router();
const { Project, Disbursement, FundRequest } = require('../models');
const { protect, authorize } = require('../middleware/authMiddleware');
const asyncHandler = require('../utils/asyncHandler');
const { redisConnection } = require('../config/redis');

// Faculty Analytics
router.get('/faculty', protect, authorize('FACULTY', 'PI'), asyncHandler(async (req, res) => {
  const userId = req.user.id || req.user._id;

  const projects = await Project.findAll({
    where: { userId },
    include: [Disbursement],
  });

  let totalBudget = 0;
  let totalReleased = 0;

  const formatted = projects.map(p => {
    const released = (p.Disbursements || []).reduce(
      (sum, d) => sum + Number(d.amount || 0),
      0
    );

    totalBudget += Number(p.sanctionedBudget || 0);
    totalReleased += released;

    return {
      id: p.id || p._id,
      title: p.title,
      released,
    };
  });

  res.json({
    totalBudget,
    totalReleased,
    utilization: totalBudget > 0 ? ((totalReleased / totalBudget) * 100).toFixed(2) : 0,
    projects: formatted,
  });
}));

// Advanced Analytics API
router.get('/advanced', protect, authorize('ADMIN', 'FINANCE_OFFICER'), asyncHandler(async (req, res) => {
  const disbursements = await Disbursement.findAll({
    include: [
      {
        model: FundRequest,
        include: [Project],
      },
    ],
  });

  const projectMap = {};

  disbursements.forEach(d => {
    const title = d.FundRequest?.Project?.title || 'Unknown';

    if (!projectMap[title]) {
      projectMap[title] = 0;
    }

    projectMap[title] += Number(d.amount || 0);
  });

  const projects = Object.keys(projectMap).map(key => ({
    title: key,
    released: projectMap[key],
  }));

  res.json({
    success: true,
    data: { projects },
  });
}));

router.get('/alerts', (req, res) => {
  res.json({ success: true, data: [] });
});

router.get('/top-projects', (req, res) => {
  res.json({ success: true, data: [] });
});

/**
 * @route   GET /api/analytics/centre/:name
 * @desc    Get project-level breakdown for a specific centre
 * @access  Private (Admin/Finance)
 */
router.get('/centre/:name', protect, authorize('ADMIN', 'FINANCE_OFFICER'), asyncHandler(async (req, res) => {
    const { name } = req.params;
    const cacheKey = `analytics:centre:${name}`;

    try {
        const cached = await redisConnection.get(cacheKey);
        if (cached) {
            return res.json({
                success: true,
                data: JSON.parse(cached),
                source: 'cache'
            });
        }
    } catch (err) {
        console.warn('[Redis Cache Error]', err.message);
    }

    const { Project, Disbursement } = require('../models');

    const data = await Project.findAll({
        where: { researchCentre: name },
        include: [{
            model: Disbursement,
            attributes: ['amount']
        }],
    });

    const result = data.map(p => ({
        projectTitle: p.title,
        disbursed: (p.Disbursements || []).reduce((sum, d) => sum + Number(d.amount || 0), 0),
    }));

    try {
        await redisConnection.set(cacheKey, JSON.stringify(result), 'EX', 60);
    } catch (err) {
        console.warn('[Redis Cache Error]', err.message);
    }

    res.json({
        success: true,
        data: result,
        source: 'db'
    });
}));

const { getDashboardMetrics } = require('../services/dashboardService');

router.get('/insights', async (req, res) => {
  const data = await getDashboardMetrics({
    fy: req.query.fy,
    organizationId: req.user?.organizationId
  });
  res.json({ success: true, data });
});

router.get('/forecast-base', (req, res) => {
  res.json({
    success: true,
    data: []
  });
});

module.exports = router;
