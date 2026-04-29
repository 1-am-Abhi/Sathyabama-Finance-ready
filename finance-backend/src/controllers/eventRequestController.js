const logger = require('../utils/logger');
const asyncHandler = require('../utils/asyncHandler');
const { EventRequest, Project, Centre } = require('../models');
const { Op } = require('sequelize');
const NotificationService = require('../services/notificationService');
const {
    approveEventPipeline,
    ensureProjectMembers,
    getEventMembersMap,
    findEventProject,
    getRecordId,
} = require('../services/financePipelineService');

const createEventRequest = asyncHandler(async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const payload = {
            ...req.body,
            facultyId: userId,
            facultyName: req.user.name || 'Faculty Member',
            department: req.user.department || 'RESEARCH',
            researchCentre: req.user.centre || 'General',
            status: 'PENDING',
            isFullDay: req.body.isFullDay !== undefined ? req.body.isFullDay : true,
            startTime: req.body.startTime,
            endTime: req.body.endTime
        };

        const newRequest = await EventRequest.create(payload);

        try {
            await NotificationService.notifyRole(
                'ADMIN',
                'New Event Request',
                `${payload.facultyName} submitted "${payload.eventTitle}" for approval.`,
                'INFO',
                '/admin/event-requests'
            );
        } catch (notifErr) {
            logger.warn('[EventRequestController] Notification failed:', notifErr.message);
        }

        return res.status(201).json({ success: true, data: newRequest });
    } catch (err) {
        logger.error('[EventRequestController] createEventRequest error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

const getEventRequests = asyncHandler(async (req, res) => {
    try {
        const options = { 
            order: [['createdAt', 'DESC']],
            include: [
                { model: Project, required: false },
                { model: Centre, required: false }
            ]
        };
        
        if (req.user && req.user.role === 'FACULTY') {
            const userId = req.user.id || req.user._id;
            options.where = { facultyId: userId };
        }

        const events = await EventRequest.findAll(options);

        if (!events || events.length === 0) {
            return res.json({ success: true, count: 0, data: [] });
        }

        const membersMap = await getEventMembersMap(events).catch(() => new Map());

        const safeData = events.map((request) => {
            const raw = request.toJSON ? request.toJSON() : request;
            
            return {
                ...raw,
                id: raw.id || raw._id,
                projectName: raw.Project?.title || raw.Project?.name || "N/A",
                centreName: raw.Centre?.name || "N/A",
                amount: Number(raw.amount || raw.approvedAmount || 0),
                members: membersMap.get(getRecordId(raw)) || [],
            };
        });

        return res.json({ success: true, count: safeData.length, data: safeData });
    } catch (err) {
        logger.error('[EventRequestController] getEventRequests error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

const updateEventRequestStatus = asyncHandler(async (req, res) => {
    try {
        const evt = await EventRequest.findByPk(req.params.id);
        if (!evt) {
            return res.status(404).json({ success: false, message: 'Event not found' });
        }
        
        const userRole = (req.user.role || '').toUpperCase();

        if (userRole === 'FACULTY') {
            if (req.body.photosUploaded !== undefined) evt.photosUploaded = req.body.photosUploaded;
            if (req.body.photoData !== undefined) evt.photoData = req.body.photoData;
            await evt.save();
            return res.status(200).json({ success: true, data: evt });
        }

        const previousStatus = evt.status;
        const pipelineResult = await approveEventPipeline(evt, req.body, req.user);

        if (pipelineResult && pipelineResult.fundRequest) {
            try {
                await NotificationService.create(
                    evt.facultyId,
                    'Event Approved',
                    `Your event "${evt.eventTitle}" was approved and moved to the Finance pipeline.`,
                    'SUCCESS',
                    '/faculty/event-requests'
                );

                await NotificationService.notifyRole(
                    'FINANCE_OFFICER',
                    'Event Awaiting Disbursement',
                    `Event "${evt.eventTitle}" is approved for ₹${Number(evt.approvedAmount || req.body.approvedAmount || 0).toLocaleString('en-IN')} and is ready in the finance queue.`,
                    'INFO',
                    '/finance/function-requests'
                );
            } catch (notifErr) {
                logger.warn('[EventRequestController] Pipeline notification failed:', notifErr.message);
            }
        } else if (evt && String(evt.status).toUpperCase() === 'APPROVED' && previousStatus !== 'APPROVED') {
            try {
                await NotificationService.create(
                    evt.facultyId,
                    'Event Approved',
                    `Your event "${evt.eventTitle}" was approved.`,
                    'SUCCESS',
                    '/faculty/event-requests'
                );
            } catch (notifErr) {
                logger.warn('[EventRequestController] Status change notification failed:', notifErr.message);
            }
        }

        return res.status(200).json({
            success: true,
            data: pipelineResult?.event || evt,
            pipeline: {
                projectId: getRecordId(pipelineResult?.project),
                fundRequestId: getRecordId(pipelineResult?.fundRequest),
                status: pipelineResult?.fundRequest ? 'APPROVED' : (pipelineResult?.event?.status || evt.status),
                redirectTo: pipelineResult?.fundRequest ? '/finance/function-requests' : null,
            },
        });
    } catch (err) {
        logger.error('[EventRequestController] updateEventRequestStatus error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

const updateEventMembers = asyncHandler(async (req, res) => {
    try {
        const { piId, memberIds } = req.body;
        const eventId = req.params.id;

        const evt = await EventRequest.findByPk(eventId);
        if (!evt) {
            return res.status(404).json({ success: false, message: 'Event not found' });
        }

        const project = await findEventProject(evt);
        if (!project) {
            return res.status(400).json({
                success: false,
                message: 'Approve the event first so the finance/project pipeline can create a valid project record.',
            });
        }

        const updatedMembers = await ensureProjectMembers(
            getRecordId(project),
            piId || evt.facultyId,
            memberIds || [],
            null
        );

        return res.status(200).json({ success: true, data: updatedMembers || [] });
    } catch (err) {
        logger.error('[EventRequestController] updateEventMembers error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = {
    createEventRequest,
    getEventRequests,
    updateEventRequestStatus,
    updateEventMembers
};

