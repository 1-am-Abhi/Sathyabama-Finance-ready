const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Centre = sequelize.define('Centre', {
    _id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    }
}, {
    timestamps: true
});

Centre.associate = (models) => {
    Centre.hasMany(models.User, { foreignKey: 'centreId', as: 'faculty' });
    Centre.hasMany(models.Project, { foreignKey: 'centreId', as: 'projects' });
    Centre.hasMany(models.FundRequest, { foreignKey: 'centreId', as: 'fundRequests' });
};

module.exports = Centre;
