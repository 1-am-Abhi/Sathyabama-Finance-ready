const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const EventRequest = sequelize.define('EventRequest', {
    _id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    facultyId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    facultyName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    department: {
        type: DataTypes.STRING,
        allowNull: false
    },
    researchCentre: {
        type: DataTypes.STRING,
        allowNull: true
    },
    eventTitle: {
        type: DataTypes.STRING,
        allowNull: false
    },
    eventType: {
        type: DataTypes.STRING,
        allowNull: false
    },
    venue: {
        type: DataTypes.STRING,
        allowNull: false
    },
    dates: {
        type: DataTypes.STRING,
        allowNull: false
    },
    isFullDay: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    startTime: {
        type: DataTypes.STRING,
        allowNull: true
    },
    endTime: {
        type: DataTypes.STRING,
        allowNull: true
    },
    participants: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    fundingType: {
        type: DataTypes.STRING,
        allowNull: false
    },
    fundingSource: {
        type: DataTypes.STRING,
        allowNull: true
    },
    approvedAmount: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'REVOKED'),
        defaultValue: 'PENDING'
    },
    photosUploaded: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    photoData: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    remarks: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    }
});

const ProjectMember = require('./ProjectMember');
const User = require('./User');
const { FundRequest } = require('./FundRequest');

EventRequest.hasMany(ProjectMember, { foreignKey: 'projectId', as: 'members', constraints: false, scope: { [DataTypes.STRING]: 'EVENT' } }); 
// Note: We'll use projectId in ProjectMember to store eventId, or just treat Event as a Project type.
// For now, let's just use the same ProjectMember but differentiate in controllers if needed.
// A better way is polymorphic or just reuse the field as resourceId.
// For the purpose of this task, I will treat EventRequest._id as a valid projectId for ProjectMember.

EventRequest.hasMany(ProjectMember, { foreignKey: 'projectId', as: 'members' });
ProjectMember.belongsTo(EventRequest, { foreignKey: 'projectId', constraints: false });

module.exports = EventRequest;
