const ODRequest = require('../models/ODRequest');

exports.createODRequest = async (req, res) => {
    try {
        const payload = {
            facultyId: req.user.id,
            facultyName: req.user.name,
            department: req.user.department,
            odType: req.body.type,
            purpose: req.body.purpose,
            startDate: req.body.startDate,
            endDate: req.body.endDate,
            days: req.body.days,
            status: 'PENDING'
        };
        const newRequest = await ODRequest.create(payload);
        res.status(201).json({ success: true, data: newRequest });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getODRequests = async (req, res) => {
    try {
        let options = { order: [['createdAt', 'DESC']] };
        if (req.user.role === 'FACULTY') {
            options.where = { facultyId: req.user.id };
        }
        const requests = await ODRequest.findAll(options);
        res.status(200).json({ success: true, data: requests });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateODRequestStatus = async (req, res) => {
    try {
        const od = await ODRequest.findByPk(req.params.id);
        if (!od) {
            return res.status(404).json({ success: false, message: 'OD Request not found' });
        }
        od.status = req.body.status;
        if (req.body.proofUploaded !== undefined) {
            od.proofUploaded = req.body.proofUploaded;
        }
        if (req.body.remarks !== undefined) {
            od.remarks = req.body.remarks;
        }
        await od.save();
        res.status(200).json({ success: true, data: od });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
