const logger = require('../utils/logger');
const asyncHandler = require('../utils/asyncHandler');
const { User, Centre, AuditLog } = require("../models");
const jwt = require("jsonwebtoken");
const { sequelize } = require("../config/db");
const bcrypt = require('bcryptjs');
const { findUserByRuntimeId, getUserUuid, publicUser } = require('../utils/userIdentity');

const generateToken = (user) => {
    const uuid = getUserUuid(user);
    return jwt.sign(
        {
            id: uuid || user.id,
            _id: uuid,
            userId: uuid || user.id,
            legacyId: user.id,
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
                user: publicUser(user)
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

        const user = await User.create({
            name,
            email,
            password,
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
                user: publicUser(user)
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
        const user = await findUserByRuntimeId(User, req.user?._id || req.user?.id || req.user?.userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        return res.status(200).json({ success: true, data: { user: publicUser(user) } });
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
            order: [["name", "ASC"]],
        });

        return res.status(200).json({ success: true, data: users || [] });
    } catch (err) {
        logger.error('[AuthController] getUsers failed, falling back to basic list:', err);
        const basicUsers = await User.findAll({
            attributes: { exclude: ["password"] },
            order: [["name", "ASC"]]
        });
        return res.status(200).json({ 
            success: true, 
            data: basicUsers || [], 
            warning: 'Some user metrics (projectsCount/eventsCount) are currently unavailable due to a database query issue.' 
        });
    }
});

const updateUser = asyncHandler(async (req, res) => {
    try {
        const user = await findUserByRuntimeId(User, req.params.id);
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
        const user = await findUserByRuntimeId(User, req.params.id);
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
        const user = await findUserByRuntimeId(User, req.user?._id || req.user?.id || req.user?.userId);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid current password" });
        }

        user.password = newPassword;
        await user.save();

        return res.status(200).json({ success: true, message: "Password updated successfully" });
    } catch (err) {
        logger.error('[AuthController] updatePassword error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

// Admin-initiated password reset for a faculty account.
// The new password is never logged; it is hashed by the User beforeSave hook.
const adminResetPassword = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;

        if (!newPassword || String(newPassword).length < 6) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 6 characters'
            });
        }

        const user = await findUserByRuntimeId(User, id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Privileged accounts must use the self-service change-password flow.
        if (['ADMIN', 'FINANCE_OFFICER', 'AUDITOR'].includes(user.role)) {
            return res.status(403).json({
                success: false,
                message: `Cannot reset password for ${user.role} accounts from this screen.`
            });
        }

        user.password = newPassword; // hashed by User beforeSave hook
        await user.save();

        await AuditLog.create({
            userId: req.user.id || req.user._id,
            action: 'PASSWORD_RESET',
            entityType: 'User',
            entityId: String(user.id)
        }).catch((e) => logger.warn('[AuthController] audit log failed for password reset:', e.message));

        return res.status(200).json({ success: true, message: 'Password reset successfully' });
    } catch (err) {
        logger.error('[AuthController] adminResetPassword error:', err);
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
    adminResetPassword,
    getCentres,
    addCentre,
    cleanupUsers
};
