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

ProjectMember.associate = (models) => {
    ProjectMember.belongsTo(models.Project, { foreignKey: 'projectId' });
    ProjectMember.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    ProjectMember.belongsTo(models.EventRequest, { 
        foreignKey: 'projectId', 
        constraints: false,
        as: 'event'
    });
};

module.exports = ProjectMember;
