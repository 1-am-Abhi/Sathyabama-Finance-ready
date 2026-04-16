const { serverError } = require("../utils/controllerError");
const User = require('../models/User');
const { syncScopusData } = require('../services/scopusService');

const updateProfile = async (req, res) => {
    try {
        console.log('Profile Update Request Received for User:', req.user.id);
        console.log('Payload:', JSON.stringify(req.body, null, 2));

        const { 
            name, designation, employeeId, joiningDate, phone, 
            officeLocation, specialization, bio, education, achievements, photo 
        } = req.body;

        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Update fields
        if (name) user.name = name;
        if (designation) user.designation = designation;
        if (employeeId) user.employeeId = employeeId;
        if (joiningDate) user.joiningDate = joiningDate;
        if (phone) user.phone = phone;
        if (officeLocation) user.officeLocation = officeLocation;
        if (specialization) user.specialization = specialization;
        if (bio) user.bio = bio;
        if (education) {
            user.education = education;
            user.changed('education', true);
        }
        if (achievements) {
            user.achievements = achievements;
            user.changed('achievements', true);
        }
        if (photo) user.photo = photo;
        
        // Mark profile as completed
        user.isProfileCompleted = true;

        await user.save();

        // Return updated user (without password)
        const userJson = user.toJSON();
        delete userJson.password;

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            user: userJson
        });
    } catch (error) {
        console.error('Update profile error:', error);
        return serverError(res, error);
    }
};

const syncScopus = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (!user || !user.scopusId) {
            return res.status(400).json({ success: false, message: 'Scopus Author ID not configured in profile' });
        }

        const result = await syncScopusData(user._id, user.scopusId);
        
        if (result.success) {
            res.status(200).json({
                success: true,
                message: 'Scopus metrics synced successfully',
                data: result.data
            });
        }
    } catch (error) {
        console.error('Scopus sync error:', error);
        return serverError(res, error);
    }
};

const getAllProfiles = async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: ['_id', 'name', 'email', 'role', 'designation', 'centre', 'department', 'scopusId', 'photo', 'isProfileCompleted']
        });
        res.status(200).json({ success: true, data: users });
    } catch (error) {
        console.error('Get all profiles error:', error);
        return serverError(res, error);
    }
};

module.exports = {
    updateProfile,
    syncScopus,
    getAllProfiles
};

