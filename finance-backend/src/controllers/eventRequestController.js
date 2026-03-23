const EventRequest = require('../models/EventRequest');

exports.createEventRequest = async (req, res) => {
    try {
        const payload = {
            ...req.body,
            facultyId: req.user.id,
            facultyName: req.user.name,
            department: req.user.department,
            researchCentre: req.user.centre || 'General',
            status: 'PENDING'
        };
        const newRequest = await EventRequest.create(payload);
        res.status(201).json({ success: true, data: newRequest });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getEventRequests = async (req, res) => {
    try {
        let options = { order: [['createdAt', 'DESC']] };
        if (req.user.role === 'FACULTY') {
            options.where = { facultyId: req.user.id };
        }
        const requests = await EventRequest.findAll(options);
        res.status(200).json({ success: true, data: requests });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateEventRequestStatus = async (req, res) => {
    try {
        const evt = await EventRequest.findByPk(req.params.id);
        if (!evt) {
            return res.status(404).json({ success: false, message: 'Event Not found' });
        }
        
        if (req.body.status) evt.status = req.body.status;
        if (req.body.approvedAmount !== undefined) evt.approvedAmount = req.body.approvedAmount;
        if (req.body.photosUploaded !== undefined) evt.photosUploaded = req.body.photosUploaded;
        if (req.body.remarks !== undefined) evt.remarks = req.body.remarks;

        await evt.save();
        res.status(200).json({ success: true, data: evt });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
