const asyncHandler = require('../utils/asyncHandler');
const { Centre, Project } = require('../models');
const { Sequelize } = require('sequelize');

/**
 * @desc    Get all research centres
 * @route   GET /api/research-centers
 * @access  Private
 */
exports.getResearchCenters = asyncHandler(async (req, res) => {
    // 1. Fetch official centres from DB
    let centres = await Centre.findAll({ order: [['name', 'ASC']] });
    
    // 2. Fallback/Discovery logic: If DB is empty, derive from Projects
    if (centres.length === 0) {
        console.log("ResearchCenterController: No centres in database, discovering from Projects...");
        const projectCentres = await Project.findAll({
            attributes: [
                [Sequelize.fn('DISTINCT', Sequelize.col('centre')), 'centreName']
            ],
            where: {
                centre: { [Sequelize.Op.not]: null }
            },
            raw: true
        });

        centres = projectCentres
            .filter(p => p.centreName && p.centreName.trim() !== '')
            .map(p => ({
                _id: `discovery:${p.centreName}`, // Virtual ID prefix
                name: p.centreName,
                isDiscovered: true
            }));
    }

    return res.status(200).json({
        success: true,
        count: centres.length,
        data: centres
    });
});

/**
 * @desc    Create a new research centre
 * @route   POST /api/research-centers
 * @access  Private/Admin
 */
exports.createResearchCenter = asyncHandler(async (req, res) => {
    const { name } = req.body;

    if (!name) {
        return res.status(400).json({ success: false, message: 'Centre name is required' });
    }

    const existing = await Centre.findOne({ where: { name: name.trim() } });
    if (existing) {
        return res.status(400).json({ success: false, message: 'A research centre with this name already exists' });
    }

    const centre = await Centre.create({ name: name.trim() });

    return res.status(201).json({
        success: true,
        data: centre
    });
});
