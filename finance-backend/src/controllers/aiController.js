const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');
const { isConfigured, generateProposal, analyze } = require('../services/aiProxyService');

const unavailable = (res) =>
    res.status(503).json({
        success: false,
        code: 'AI_UNAVAILABLE',
        message: 'AI assistance is not configured on the server.',
        data: null,
    });

const proposal = asyncHandler(async (req, res) => {
    if (!isConfigured()) return unavailable(res);
    try {
        const data = await generateProposal({ topic: req.body?.topic });
        return res.json({ success: true, data });
    } catch (e) {
        if (e.code === 'BAD_INPUT') {
            return res.status(400).json({ success: false, message: e.message, data: null });
        }
        if (e.code === 'AI_UNAVAILABLE') return unavailable(res);
        logger.error('[AI] proposal failed:', e.message);
        return res.status(502).json({ success: false, code: 'AI_ERROR', message: 'AI request failed.', data: null });
    }
});

const analyzeHandler = asyncHandler(async (req, res) => {
    if (!isConfigured()) return unavailable(res);
    try {
        const data = await analyze({ task: req.body?.task, context: req.body?.context });
        return res.json({ success: true, data });
    } catch (e) {
        if (e.code === 'AI_UNAVAILABLE') return unavailable(res);
        logger.error('[AI] analyze failed:', e.message);
        return res.status(502).json({ success: false, code: 'AI_ERROR', message: 'AI request failed.', data: null });
    }
});

module.exports = { proposal, analyze: analyzeHandler };
