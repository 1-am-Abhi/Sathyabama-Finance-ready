const User = require("../models/User");
const jwt = require("jsonwebtoken");
const Centre = require("../models/Centre");
const { sequelize } = require("../config/db");

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

// Only surface the real error message in development
const serverError = (res, error) => {
  console.error('[AUTH]', error);
  const message =
    process.env.NODE_ENV === 'development' ? error.message : 'Internal server error';
  return res.status(500).json({ success: false, message });
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    if (user.status === "Inactive") {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated. Please contact the administrator.",
      });
    }

    const token = generateToken(user);
    const userData = user.toJSON();
    delete userData.password;

    res.status(200).json({
      success: true,
      token,
      user: userData,
    });
  } catch (error) {
    return serverError(res, error);
  }
};

exports.register = async (req, res) => {
  try {
    const { name, email, password, role, department, centre } = req.body;

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "User already exists" });
    }

    const user = await User.create({ name, email, password, role, department, centre });

    const token = generateToken(user);
    const userData = user.toJSON();
    delete userData.password;

    res.status(201).json({
      success: true,
      token,
      user: userData,
    });
  } catch (error) {
    return serverError(res, error);
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id || req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    const userData = user.toJSON();
    delete userData.password;
    res.status(200).json({ success: true, user: userData });
  } catch (error) {
    return serverError(res, error);
  }
};

exports.getUsers = async (req, res) => {
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

    res.status(200).json({ success: true, users });
  } catch (error) {
    return serverError(res, error);
  }
};

exports.updateUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    await user.update(req.body);
    res.status(200).json({ success: true, message: "User updated successfully" });
  } catch (error) {
    return serverError(res, error);
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    await user.destroy();
    res.status(200).json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    return serverError(res, error);
  }
};

exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findByPk(req.user.id || req.user._id);

    if (!user || !(await user.comparePassword(currentPassword))) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    return serverError(res, error);
  }
};

exports.getCentres = async (req, res) => {
  try {
    const centres = await Centre.findAll({ order: [["name", "ASC"]] });
    res.status(200).json({ success: true, data: centres.map((c) => c.name) });
  } catch (error) {
    return serverError(res, error);
  }
};

exports.addCentre = async (req, res) => {
  try {
    const { name } = req.body;
    const [centre, created] = await Centre.findOrCreate({ where: { name } });
    if (!created) {
      return res.status(400).json({ success: false, message: "Centre already exists" });
    }
    res.status(201).json({ success: true, centre });
  } catch (error) {
    return serverError(res, error);
  }
};
