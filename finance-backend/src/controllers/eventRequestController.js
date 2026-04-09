const EventRequest = require('../models/EventRequest');
const { Op } = require('sequelize');
const NotificationService = require('../services/notificationService');
const {
    approveEventPipeline,
    ensureProjectMembers,
    getEventMembersMap,
    findEventProject,
    getRecordId,
} = require('../services/financePipelineService');

exports.createEventRequest = async (req, res) => {
    try {
        console.log('Creating Event Request. User:', req.user?.name, 'Dept:', req.user?.department);
        console.log('Payload:', req.body);

        const payload = {
            ...req.body,
            facultyId: req.user.id || req.user._id,
            facultyName: req.user.name || 'Faculty Member',
            department: req.user.department || 'RESEARCH',
            researchCentre: req.user.centre || 'General',
            status: 'PENDING',
            isFullDay: req.body.isFullDay !== undefined ? req.body.isFullDay : true,
            startTime: req.body.startTime,
            endTime: req.body.endTime
        };
        const newRequest = await EventRequest.create(payload);
        await NotificationService.notifyRole(
            'ADMIN',
            'New Event Request',
            `${payload.facultyName} submitted "${payload.eventTitle}" for approval.`,
            'INFO',
            '/admin/event-requests'
        );
        res.status(201).json({ success: true, data: newRequest });
    } catch (error) {
        console.error('Event Submission Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getEventRequests = async (req, res) => {
    try {
        const options = { order: [['createdAt', 'DESC']] };
        
        if (req.user.role === 'FACULTY') {
            const userId = req.user.id || req.user._id;

            options.where = {
                facultyId: userId,
            };
        }
        
        const requests = await EventRequest.findAll(options);
        const membersMap = await getEventMembersMap(requests);
        const data = requests.map((request) => {
            const raw = request.toJSON ? request.toJSON() : request;
            return {
                ...raw,
                members: membersMap.get(getRecordId(raw)) || [],
            };
        });

        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Get Event Requests Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateEventRequestStatus = async (req, res) => {
    try {
        const evt = await EventRequest.findByPk(req.params.id);
        if (!evt) {
            return res.status(404).json({ success: false, message: 'Event Not found' });
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

        if (pipelineResult.fundRequest) {
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
        } else if (String(evt.status).toUpperCase() === 'APPROVED' && previousStatus !== 'APPROVED') {
            await NotificationService.create(
                evt.facultyId,
                'Event Approved',
                `Your event "${evt.eventTitle}" was approved.`,
                'SUCCESS',
                '/faculty/event-requests'
            );
        }

        res.status(200).json({
            success: true,
            data: pipelineResult.event,
            pipeline: {
                projectId: getRecordId(pipelineResult.project),
                fundRequestId: getRecordId(pipelineResult.fundRequest),
                status: pipelineResult.fundRequest ? 'PENDING_DISBURSAL' : pipelineResult.event.status,
                redirectTo: pipelineResult.fundRequest ? '/finance/function-requests' : null,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateEventMembers = async (req, res) => {
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

        res.status(200).json({ success: true, data: updatedMembers });
    } catch (error) {
        console.error('Update Event Members Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
