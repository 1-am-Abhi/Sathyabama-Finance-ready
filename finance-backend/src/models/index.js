const { sequelize } = require('../config/db');
const { Sequelize } = require('sequelize');

const models = {
    AcademicMetric: require('./AcademicMetric'),
    Centre: require('./Centre'),
    Disbursement: require('./Disbursement'),
    Document: require('./Document'),
    EquipmentRequest: require('./EquipmentRequest'),
    EventRequest: require('./EventRequest'),
    FundRequest: require('./FundRequest').FundRequest || require('./FundRequest'),
    FundSource: require('./FundSource'),
    InternshipFee: require('./InternshipFee'),
    Notification: require('./Notification'),
    ODRequest: require('./ODRequest'),
    PFMSTransaction: require('./PFMSTransaction'),
    Project: require('./Project'),
    ProjectMember: require('./ProjectMember'),
    Revenue: require('./Revenue'),
    User: require('./User'),
};

// Run associations
Object.keys(models).forEach(modelName => {
    if (models[modelName].associate) {
        models[modelName].associate(models);
    }
});

models.sequelize = sequelize;
models.Sequelize = Sequelize;

module.exports = models;
