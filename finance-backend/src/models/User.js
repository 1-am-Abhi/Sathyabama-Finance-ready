const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
    _id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    role: {
        type: DataTypes.ENUM('ADMIN', 'FACULTY', 'FINANCE_OFFICER'),
        defaultValue: 'FACULTY'
    },
    department: {
        type: DataTypes.STRING,
        allowNull: false
    },
    centre: {
        type: DataTypes.STRING,
        allowNull: true
    },
    centreId: {
        type: DataTypes.UUID,
        allowNull: true
    },
    designation: {
        type: DataTypes.STRING,
        allowNull: true
    },
    employeeId: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true
    },
    joiningDate: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: true
    },
    officeLocation: {
        type: DataTypes.STRING,
        allowNull: true
    },
    specialization: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    scopusId: {
        type: DataTypes.STRING,
        allowNull: true
    },
    designationCategory: {
        type: DataTypes.ENUM('FACULTY', 'SCIENTIFIC_ASSISTANT', 'TECHNICAL_ASSISTANT', 'JRF', 'SRF', 'PDF', 'OTHER'),
        defaultValue: 'FACULTY'
    },
    bio: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    education: {
        type: DataTypes.JSONB,
        defaultValue: []
    },
    achievements: {
        type: DataTypes.JSONB,
        defaultValue: []
    },
    photo: {
        type: DataTypes.TEXT, // Base64 or URL
        allowNull: true
    },
    isProfileCompleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    status: {
        type: DataTypes.ENUM('Active', 'Inactive'),
        defaultValue: 'Active'
    }
}, {
    hooks: {
        beforeSave: async (user) => {
            if (user.changed('password')) {
                const salt = await bcrypt.genSalt(10);
                user.password = await bcrypt.hash(user.password, salt);
            }
        }
    }
});

User.prototype.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = User;
