const asyncHandler = require('../utils/asyncHandler');
const { User, Centre } = require("../models");
const jwt = require("jsonwebtoken");
const { sequelize } = require("../config/db");
const bcrypt = require('bcryptjs');

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id || user.id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

const login = async (req, res) => {
  try {
    console.log('LOGIN REQUEST:', req.body);

    const { email, password } = req.body;

    // 🔴 Step 1: Validate input
    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required'
      });
    }

    // 🔴 Step 2: Find user
    const user = await User.findOne({
      where: { email }
    });

    console.log('USER FOUND:', user ? { id: user.id, email: user.email, role: user.role } : 'NULL');

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    // 🔴 Step 3: Check password safely
    if (!user.password) {
      throw new Error('Password not stored properly in DB');
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        message: 'Invalid password'
      });
    }

    // 🔴 Step 4: Generate token
    const token = jwt.sign(
      { id: user._id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      token,
      user: {
        id: user._id || user.id,
        email: user.email,
        role: user.role,
        name: user.name
      }
    });

  } catch (err) {
    console.error('🔥 LOGIN ERROR FULL:', err);

    return res.status(500).json({
      message: err.message
    });
  }
};

/**
 * Lightweight Auth Health Probe
 * Helps catch schema or connection issues without processing credentials
 */
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
    console.error('🚨 AUTH HEALTH FAILED:', err);
    return res.status(503).json({
      success: false,
      status: 'DOWN',
      error: err.message
    });
  }
};

const register = asyncHandler(async (req, res) => {
  const { name, email, password, role, department, centre } = req.body;

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
    role, 
    department, 
    centre 
  });
  
  console.log(`[USER CREATED] ${user.email} - ${user.role}`);

  const token = generateToken(user);
  
  res.status(201).json({
    success: true,
    token,
    user: {
      id: user._id || user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      department: user.department,
      centre: user.centre
    }
  });
});

const cleanupUsers = asyncHandler(async (req, res) => {
    // SAFETY GUARD: This endpoint is permanently disabled in production
    // to prevent accidental bulk deletion of faculty accounts.
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

    res.status(200).json({
      success: true,
      message: `System cleanup completed. Removed ${deletedCount} unauthorized users.`,
      data: { deletedCount }
    });
});

const getMe = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.user.id || req.user._id);
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }
  const userData = user.toJSON();
  delete userData.password;
  res.status(200).json({ success: true, user: userData });
});

const getUsers = asyncHandler(async (req, res) => {
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

  res.status(200).json({ success: true, users: users || [] });
});

const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  await user.update(req.body);
  res.status(200).json({ success: true, message: "User updated successfully" });
});

const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  // SAFETY GUARD: Prevent deletion of privileged accounts
  if (['ADMIN', 'FINANCE_OFFICER'].includes(user.role)) {
    return res.status(403).json({
      success: false,
      message: `Cannot delete ${user.role} accounts. Deactivate the account instead.`
    });
  }

  await user.destroy();
  res.status(200).json({ success: true, message: "User deleted successfully" });
});

const updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findByPk(req.user.id || req.user._id);

  if (!user || !(await user.comparePassword(currentPassword))) {
    return res.status(401).json({ success: false, message: "Invalid credentials" });
  }

  user.password = newPassword;
  await user.save();

  res.status(200).json({ success: true, message: "Password updated successfully" });
});

const getCentres = asyncHandler(async (req, res) => {
  const centres = await Centre.findAll({ order: [["name", "ASC"]] });
  res.status(200).json({ success: true, data: (centres || []).map((c) => c.name) });
});

const addCentre = asyncHandler(async (req, res) => {
  const { name } = req.body;
  const [centre, created] = await Centre.findOrCreate({ where: { name } });
  if (!created) {
    return res.status(400).json({ success: false, message: "Centre already exists" });
  }
  res.status(201).json({ success: true, centre });
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

