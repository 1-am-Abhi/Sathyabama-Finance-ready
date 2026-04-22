const asyncHandler = require('../utils/asyncHandler');
const { Centre, ResearchCenter, Project } = require('../models');
const { Sequelize } = require('sequelize');
const { isResearchCenterFailure } = require('../utils/researchCenterSafety');

const ResearchCenterModel = ResearchCenter || Centre;
const DEFAULT_RESEARCH_CENTERS = [
    { name: 'CMNS', code: 'CMNS' },
    { name: 'AI Lab', code: 'AI' },
    { name: 'Biotech', code: 'BIO' },
];

const discoverProjectCentres = async () => {
    const projectCentres = await Project.findAll({
        attributes: [
            [Sequelize.fn('DISTINCT', Sequelize.col('centre')), 'centreName']
        ],
        where: {
            centre: { [Sequelize.Op.not]: null }
        },
        raw: true
    });

    return projectCentres
        .filter(p => p.centreName && p.centreName.trim() !== '')
        .map(p => ({
            _id: `discovery:${p.centreName}`,
            name: p.centreName,
            code: null,
            isDiscovered: true
        }));
};

/**
 * @desc    Get all research centres
 * @route   GET /api/research-centers
 * @access  Private
 */
exports.getResearchCenters = asyncHandler(async (req, res) => {
    let centres = [];

    try {
        if (ResearchCenterModel) {
            centres = await ResearchCenterModel.findAll({ order: [['name', 'ASC']] });
        }
    } catch (error) {
        if (!isResearchCenterFailure(error)) {
            throw error;
        }
        console.warn('[ResearchCenterController] ResearchCenters table unavailable, falling back to project discovery.');
        centres = [];
    }

    if (centres.length === 0) {
        console.log("ResearchCenterController: No centres in database, discovering from Projects...");
        centres = await discoverProjectCentres();
    }

    if (centres.length === 0) {
        centres = DEFAULT_RESEARCH_CENTERS.map((centre) => ({
            _id: `default:${centre.code}`,
            ...centre,
            isDefault: true,
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

    const existing = await ResearchCenterModel.findOne({ where: { name: name.trim() } });
    if (existing) {
        return res.status(400).json({ success: false, message: 'A research centre with this name already exists' });
    }

    const centre = await ResearchCenterModel.create({ name: name.trim() });

    return res.status(201).json({
        success: true,
        data: centre
    });
});

/**
 * @desc    Delete a research centre
 * @route   DELETE /api/research-centers/:id
 * @access  Private/Admin
 */
exports.deleteResearchCenter = asyncHandler(async (req, res) => {
    const centre = await ResearchCenterModel.findByPk(req.params.id);

    if (!centre) {
        return res.status(404).json({ success: false, message: 'Research centre not found' });
    }

    await centre.destroy();

    return res.status(200).json({
        success: true,
        message: 'Research centre deleted successfully'
    });
});
