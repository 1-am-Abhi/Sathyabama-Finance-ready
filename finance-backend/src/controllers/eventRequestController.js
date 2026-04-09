const EventRequest = require('../models/EventRequest');
const ProjectMember = require('../models/ProjectMember');
const User = require('../models/User');
const { Op } = require('sequelize');

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
        res.status(201).json({ success: true, data: newRequest });
    } catch (error) {
        console.error('Event Submission Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getEventRequests = async (req, res) => {
    try {
        let options = { 
            order: [['createdAt', 'DESC']],
            include: [
                {
                    model: ProjectMember,
                    as: 'members',
                    include: [{ 
                        model: User, 
                        as: 'user', 
                        attributes: ['_id', 'name', 'email'],
                        include: [{ model: require('../models/Centre'), as: 'researchCentre', attributes: ['name'] }]
                    }]
                }
            ]
        };
        
        if (req.user.role === 'FACULTY') {
            const userId = req.user.id || req.user._id;
            
            // Get all event IDs where this user is a member
            const memberships = await ProjectMember.findAll({
                where: { userId: userId },
                attributes: ['projectId']
            });
            const eventIds = memberships.map(m => m.projectId);

            options.where = {
                [Op.or]: [
                    { facultyId: userId },
                    { _id: { [Op.in]: eventIds } }
                ]
            };
        }
        
        const requests = await EventRequest.findAll(options);
        res.status(200).json({ success: true, data: requests });
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
            // Faculty can only update photo proof fields
            if (req.body.photosUploaded !== undefined) evt.photosUploaded = req.body.photosUploaded;
            if (req.body.photoData !== undefined) evt.photoData = req.body.photoData;
        } else {
            // Admins can update everything
            if (req.body.status) evt.status = req.body.status;
            if (req.body.approvedAmount !== undefined) evt.approvedAmount = req.body.approvedAmount;
            if (req.body.photosUploaded !== undefined) evt.photosUploaded = req.body.photosUploaded;
            if (req.body.photoData !== undefined) evt.photoData = req.body.photoData;
            if (req.body.remarks !== undefined) evt.remarks = req.body.remarks;
        }

        await evt.save();

        // If newly approved and no members exist, add the requesting faculty as the PI
        if (evt.status === 'APPROVED') {
            const existingMembers = await ProjectMember.count({ where: { projectId: evt._id } });
            if (existingMembers === 0) {
                await ProjectMember.create({
                    projectId: evt._id,
                    userId: evt.facultyId,
                    role: 'PI'
                });
            }
        }

        res.status(200).json({ success: true, data: evt });
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

        // Delete existing members
        await ProjectMember.destroy({ where: { projectId: eventId } });

        const members = [];
        if (piId) {
            const piUser = await User.findByPk(piId);
            if (piUser) {
                members.push({ projectId: eventId, userId: piId, role: 'PI' });
                // If the PI is changed, update the main event's faculty record for legacy compatibility
                evt.facultyId = piId;
                evt.facultyName = piUser.name;
                await evt.save();
            }
        }

        if (memberIds && Array.isArray(memberIds)) {
            memberIds.forEach(mId => {
                if (mId !== piId) {
                    members.push({ projectId: eventId, userId: mId, role: 'MEMBER' });
                }
            });
        }

        if (members.length > 0) {
            await ProjectMember.bulkCreate(members);
        }

        const updatedMembers = await ProjectMember.findAll({
            where: { projectId: eventId },
            include: [{ 
                model: User, 
                as: 'user', 
                attributes: ['_id', 'name', 'email'],
                include: [{ model: require('../models/Centre'), as: 'researchCentre', attributes: ['name'] }]
            }]
        });

        res.status(200).json({ success: true, data: updatedMembers });
    } catch (error) {
        console.error('Update Event Members Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
