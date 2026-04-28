const { AuditLog } = require("../models");
const asyncHandler = require("../utils/asyncHandler");

const getAuditTimeline = asyncHandler(async (req, res) => {
    const { requestId } = req.params;

    const logs = await AuditLog.findAll({
        where: { entityId: requestId },
        order: [["createdAt", "ASC"]],
    });

    res.json({ success: true, data: logs });
});

module.exports = { getAuditTimeline };
