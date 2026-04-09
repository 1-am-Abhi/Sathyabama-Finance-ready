const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const InternshipFee = sequelize.define('InternshipFee', {
    _id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    studentName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    studentId: {
        type: DataTypes.STRING,
        allowNull: false
    },
    internshipTitle: {
        type: DataTypes.STRING,
        allowNull: false
    },
    feeAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    paymentStatus: {
        type: DataTypes.ENUM('PENDING', 'PAID'),
        defaultValue: 'PENDING'
    },
    adminStatus: {
        type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED'),
        defaultValue: 'PENDING'
    },
    adminRemarks: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    paymentMode: {
        type: DataTypes.STRING,
        allowNull: true
    },
    receiptNumber: {
        type: DataTypes.STRING,
        allowNull: true
    },
    paymentDate: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    verifiedBy: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'Users',
            key: '_id'
        }
    }
}, {
    timestamps: true
});

module.exports = InternshipFee;
