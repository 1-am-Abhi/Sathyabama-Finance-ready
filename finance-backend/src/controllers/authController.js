const logger = require('../utils/logger');
const asyncHandler = require('../utils/asyncHandler');
const { User, Centre } = require("../models");
const jwt = require("jsonwebtoken");
const { sequelize } = require("../config/db");
const bcrypt = require('bcryptjs');

const generateToken = (user) => {
    return jwt.sign(
        {
            id: user._id || user.id,
            userId: user._id || user.id,
            role: user.role,
            email: user.email,
            organizationId: user.organizationId,
        },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        logger.info('LOGIN ATTEMPT:', { email });

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        const user = await User.findOne({
            where: { email }
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        if (!user.password) {
            throw new Error('Password storage inconsistency detected');
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const token = generateToken(user);

        return res.json({
            success: true,
            data: {
                token,
                user: {
                    id: user._id || user.id,
                    email: user.email,
                    role: user.role,
                    name: user.name,
                    department: user.department,
                    centre: user.centre,
                    organizationId: user.organizationId
                }
            },
            message: 'Login successful'
        });

    } catch (err) {
        logger.error('[AuthController] login error:', err);
        return res.status(500).json({
            success: false,
            message: 'Internal server error during login'
        });
    }
};

const checkAuthHealth = async (req, res) => {
    try {
        const userCount = await User.count();
        return res.json({
            success: true,
            status: 'UP',
            diagnostics: {
                userTableAccessible: true,
                recordCount: userCount,
                timestamp: new Date().toISOString()
            }
        });
    } catch (err) {
        logger.error('[AuthController] checkAuthHealth failed:', err);
        return res.status(503).json({
            success: false,
            status: 'DOWN',
            error: err.message
        });
    }
};

const register = asyncHandler(async (req, res) => {
    try {
        const { name, email, password, role, department, centre } = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
        }

        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "User already exists" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await User.create({ 
            name, 
            email, 
            password: hashedPassword, 
            role: role || 'FACULTY', 
            department, 
            centre,
            organizationId: req.body.organizationId || 'ORG_1'
        });
        
        logger.info(`[USER REGISTERED] ${user.email} - ${user.role}`);

        const token = generateToken(user);
        
        return res.status(201).json({
            success: true,
            data: {
                token,
                user: {
                    id: user._id || user.id,
                    email: user.email,
                    role: user.role,
                    name: user.name,
                    department: user.department,
                    centre: user.centre,
                    organizationId: user.organizationId
                }
            }
        });
    } catch (err) {
        logger.error('[AuthController] register error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

const cleanupUsers = asyncHandler(async (req, res) => {
    try {
        if (process.env.NODE_ENV === 'production') {
            return res.status(403).json({
                success: false,
                message: 'This operation is disabled in production to protect user data.'
            });
        }

        const { Op } = require('sequelize');
        const deletedCount = await User.destroy({
            where: {
                role: {
                    [Op.notIn]: ['ADMIN', 'FINANCE_OFFICER']
                }
            }
        });

        return res.status(200).json({
            success: true,
            message: `System cleanup completed. Removed ${deletedCount} unauthorized users.`,
            data: { deletedCount }
        });
    } catch (err) {
        logger.error('[AuthController] cleanupUsers error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

const getMe = asyncHandler(async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id || req.user._id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        
        const userData = user.toJSON();
        delete userData.password;
        
        return res.status(200).json({ success: true, data: { user: userData } });
    } catch (err) {
        logger.error('[AuthController] getMe error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

const getUsers = asyncHandler(async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: {
                exclude: ["password"],
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
                        "projectsCount",
                    ],
                    [
                        sequelize.literal(`(
                            SELECT COUNT(*)
                            FROM "EventRequests" AS er
                            WHERE er."facultyId" = "User"."_id" AND er.status = 'APPROVED'
                        )`),
                        "eventsCount",
                    ],
                ],
            },
        });

        return res.status(200).json({ success: true, data: users || [] });
    } catch (err) {
        logger.error('[AuthController] getUsers error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

const updateUser = asyncHandler(async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const updateData = { ...req.body };
        delete updateData.password; // Don't allow password update via this endpoint

        await user.update(updateData);
        return res.status(200).json({ success: true, message: "User updated successfully", data: user });
    } catch (err) {
        logger.error('[AuthController] updateUser error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

const deleteUser = asyncHandler(async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (['ADMIN', 'FINANCE_OFFICER'].includes(user.role)) {
            return res.status(403).json({
                success: false,
                message: `Cannot delete ${user.role} accounts. Deactivate the account instead.`
            });
        }

        await user.destroy();
        return res.status(200).json({ success: true, message: "User deleted successfully" });
    } catch (err) {
        logger.error('[AuthController] deleteUser error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

const updatePassword = asyncHandler(async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findByPk(req.user.id || req.user._id);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid current password" });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        return res.status(200).json({ success: true, message: "Password updated successfully" });
    } catch (err) {
        logger.error('[AuthController] updatePassword error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

const getCentres = asyncHandler(async (req, res) => {
    try {
        const centres = await Centre.findAll({ order: [["name", "ASC"]] });
        return res.status(200).json({ success: true, data: (centres || []).map((c) => c.name) });
    } catch (err) {
        logger.error('[AuthController] getCentres error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

const addCentre = asyncHandler(async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ success: false, message: 'Centre name is required' });

        const [centre, created] = await Centre.findOrCreate({ where: { name } });
        if (!created) {
            return res.status(400).json({ success: false, message: "Centre already exists" });
        }
        return res.status(201).json({ success: true, data: centre });
    } catch (err) {
        logger.error('[AuthController] addCentre error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = {
    login,
    register,
    checkAuthHealth,
    getMe,
    getUsers,
    updateUser,
    deleteUser,
    updatePassword,
    getCentres,
    addCentre,
    cleanupUsers
};
