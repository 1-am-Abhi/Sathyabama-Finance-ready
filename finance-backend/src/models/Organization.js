const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Organization = sequelize.define('Organization', {
  name: DataTypes.STRING,
});

module.exports = Organization;
