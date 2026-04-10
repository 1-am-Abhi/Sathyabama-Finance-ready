const User = require('../models/User');
const jwt = require('jsonwebtoken');
const Centre = require('../models/Centre');

const generateToken = (user) => {
    return jwt.sign(
        { id: user._id, role: user.role, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );
};

exports.register = async (req, res) => {
    try {
        const { name, email, password, role, department, centre } = req.body;
        
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }
        
        const user = await User.create({ name, email, password, role, department, centre });
        
        const token = generateToken(user);
        res.status(201).json({
            success: true,
            user: { 
                _id: user._id, 
                name: user.name, 
                role: user.role, 
                email: user.email, 
                department: user.department, 
                centre: user.centre,
                isProfileCompleted: user.isProfileCompleted,
                designation: user.designation,
                employeeId: user.employeeId,
                joiningDate: user.joiningDate,
                phone: user.phone,
                officeLocation: user.officeLocation,
                specialization: user.specialization,
                bio: user.bio,
                education: user.education,
                achievements: user.achievements,
                photo: user.photo
            },
            token
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password, role } = req.body;
        
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(401).json({ success: false, message: 'Incorrect email' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Incorrect password' });
        }

        if (role && user.role !== role) {
            return res.status(403).json({ success: false, message: 'Invalid role selection' });
        }

        if (user.status === 'Inactive') {
            return res.status(403).json({ 
                success: false, 
                message: 'Your account has been deactivated. Please contact the administrator.' 
            });
        }
        
        const token = generateToken(user);
        res.status(200).json({
            success: true,
            user: { 
                _id: user._id, 
                name: user.name, 
                role: user.role, 
                email: user.email, 
                department: user.department, 
                centre: user.centre,
                status: user.status,
                isProfileCompleted: user.isProfileCompleted,
                designation: user.designation,
                employeeId: user.employeeId,
                joiningDate: user.joiningDate,
                phone: user.phone,
                officeLocation: user.officeLocation,
                specialization: user.specialization,
                bio: user.bio,
                education: user.education,
                achievements: user.achievements,
                photo: user.photo
            },
            token
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        await user.destroy();
        res.status(200).json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getMe = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        // Remove password from response
        const userJson = user.toJSON();
        delete userJson.password;
        
        res.status(200).json({ success: true, user: userJson });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getUsers = async (req, res) => {
    try {
        const { sequelize } = require('../config/db');

        const users = await User.findAll({
            attributes: { 
                exclude: ['password'],
                include: [
                    [
                        sequelize.literal(`(
                            SELECT COUNT(DISTINCT p."_id")
                            FROM "Projects" AS p
                            LEFT JOIN "ProjectMembers" AS pm
                              ON pm."projectId" = p."_id"
                            WHERE
                              p."facultyId" = "User"."_id"
                              OR p."userId" = "User"."_id"
                              OR pm."userId" = "User"."_id"
                        )`),
                        'projectsCount'
                    ],
                    [
                        sequelize.literal(`(
                            SELECT COUNT(DISTINCT p."_id")
                            FROM "Projects" AS p
                            LEFT JOIN "ProjectMembers" AS pm
                              ON pm."projectId" = p."_id"
                            WHERE
                              p."facultyId" = "User"."_id"
                              OR p."userId" = "User"."_id"
                              OR pm."userId" = "User"."_id"
                        )`),
                        'projectCount'
                    ],
                    [
                        sequelize.literal(`(
                            SELECT COUNT(*)
                            FROM "EventRequests" AS er
                            WHERE er."facultyId" = "User"."_id" AND er.status = 'APPROVED'
                        )`),
                        'eventsCount'
                    ]
                ]
            },
            include: [
                { model: Centre, as: 'researchCentre', attributes: ['name'] }
            ]
        });
        res.status(200).json({ success: true, users });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updatePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findByPk(req.user.id);
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        if (!(await user.comparePassword(currentPassword))) {
            return res.status(401).json({ success: false, message: 'Invalid current password' });
        }
        
        user.password = newPassword;
        await user.save();
        
        res.status(200).json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        await user.update(req.body);
        res.status(200).json({ success: true, message: 'User updated successfully', user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getCentres = async (req, res) => {
    try {
        const centres = await Centre.findAll({
            order: [['name', 'ASC']]
        });
        
        // Return both the full objects and just names for compatibility
        res.status(200).json({ 
            success: true, 
            data: centres.map(c => c.name),
            fullData: centres 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
