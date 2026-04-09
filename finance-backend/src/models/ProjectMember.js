const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const ProjectMember = sequelize.define('ProjectMember', {
    _id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    projectId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    role: {
        type: DataTypes.ENUM('PI', 'MEMBER'),
        defaultValue: 'MEMBER'
    }
}, {
    indexes: [
        {
            unique: true,
            fields: ['projectId', 'userId']
        }
    ]
});

module.exports = ProjectMember;
