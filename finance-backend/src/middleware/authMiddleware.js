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

exports.authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            console.log('--- Authorization Failed Detail ---');
            console.log(`Required Roles: [${roles.join(', ')}]`);
            console.log(`User's Role in Session: "${req.user.role}"`);
            console.log(`User's Role Type: ${typeof req.user.role}`);
            console.log('-----------------------------------');
            return res.status(403).json({ success: false, message: 'Not authorized for this role' });
        }
        next();
    };
};
