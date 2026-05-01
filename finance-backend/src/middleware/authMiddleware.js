const logger = require('../utils/logger');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }
    
    if (!token) {
        return res.status(401).json({ success: false, message: 'Not authorized, no token' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = decoded;

        if (!(req.user?.id || req.user?.userId) || !req.user?.organizationId) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }

        const user = await User.findByPk(decoded.id || decoded.userId);
        if (!user) {
            return res.status(401).json({ success: false, message: 'User not found' });
        }
        req.user = {
            ...user.toJSON(),
            id: user._id || user.id,
            userId: user._id || user.id,
            _id: user._id || user.id,
            organizationId: user.organizationId || decoded.organizationId
        };
        if (!req.user?.id || !req.user?.organizationId) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }
        logger.info('Auth Middleware - User identified:', req.user.name, 'Role:', req.user.role, 'Dept:', req.user.department);
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(401).json({ success: false, message: 'Not authorized, user missing' });
        }

        const userRole = req.user.role.toLowerCase();
        const requiredRoles = roles.map(r => r.toLowerCase());
        
        logger.info(`[RBAC] Authorizing role: "${userRole}" against [${requiredRoles.join(', ')}]`);

        if (!requiredRoles.includes(userRole)) {
            logger.warn(`[RBAC] Access Denied: User "${req.user.name}" with role "${userRole}" attempted to access restricted route.`);
            return res.status(403).json({ 
                success: false, 
                message: 'Not authorized for this role'
            });
        }
        next();
    };
};

module.exports = { protect, authorize };
