const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validate, loginSchema, registerSchema } = require('../utils/validation');

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.get('/me', protect, authController.getMe);
router.get('/users', protect, authController.getUsers);
router.get('/centres', authController.getCentres);
router.put('/update-password', protect, authController.updatePassword);
router.put('/users/:id', protect, authorize('ADMIN'), authController.updateUser);
router.delete('/users/:id', protect, authorize('ADMIN'), authController.deleteUser);

module.exports = router;
