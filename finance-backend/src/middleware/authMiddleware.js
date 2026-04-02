const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }
    
    if (!token) {
        return res.status(401).json({ success: false, message: 'Not authorized, no token' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findByPk(decoded.id);
        if (!user) {
            return res.status(401).json({ success: false, message: 'User not found' });
        }
        req.user = {
            ...user.toJSON(),
            id: user._id
        };
        console.log('Auth Middleware - User identified:', req.user.name, 'Role:', req.user.role, 'Dept:', req.user.department);
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
};

exports.authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(401).json({ success: false, message: 'Not authorized, user missing' });
        }

        const userRole = req.user.role.toLowerCase();
        const requiredRoles = roles.map(r => r.toLowerCase());
        
        console.log(`[RBAC] Authorizing role: "${userRole}" against [${requiredRoles.join(', ')}]`);

        if (!requiredRoles.includes(userRole)) {
            console.warn(`[RBAC] Access Denied: User "${req.user.name}" with role "${userRole}" attempted to access restricted route.`);
            // Send exact structured error to help frontend debugging
            return res.status(403).json({ 
                success: false, 
                message: 'Not authorized for this role'
            });
        }
        next();
    };
};

exports.authorize = exports.authorizeRoles;
