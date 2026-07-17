const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Project = sequelize.define('Project', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    organizationId: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'ORG_1',
    },
    facultyId: {
        type: DataTypes.UUID,
        allowNull: true
    },
    pi: {
        type: DataTypes.STRING,
        allowNull: false
    },
    department: {
        type: DataTypes.STRING,
        allowNull: false
    },
    centre: {
        type: DataTypes.STRING,
        allowNull: true
    },
    sanctionedBudget: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    // These columns exist in the table but were absent from the model, so the
    // disbursement pipeline's Project.update({ releasedBudget }) was silently
    // dropped by Sequelize and the stored value stayed 0 (stale). Declaring them
    // lets the pipeline keep them in lockstep with the disbursement ledger.
    releasedBudget: {
        type: DataTypes.FLOAT,
        allowNull: true,
        defaultValue: 0
    },
    utilizedBudget: {
        type: DataTypes.FLOAT,
        allowNull: true,
        defaultValue: 0
    },
    fundingSource: {
        type: DataTypes.STRING,
        allowNull: false
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'PENDING'
    },
    // These columns already exist in the Projects table but were absent from the
    // model, so Sequelize never persisted or returned them — Project Details
    // showed N/A for Sanction/Start/End dates even though the faculty entered them.
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    projectType: {
        type: DataTypes.STRING,
        allowNull: true
    },
    publicationYear: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    startDate: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    endDate: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    // Derived, not a column: whole years between start and end (min 1). The
    // faculty enters a duration in years at creation; the controller converts it
    // to an endDate, and this virtual reflects it consistently everywhere.
    duration: {
        type: DataTypes.VIRTUAL,
        get() {
            const s = this.getDataValue('startDate');
            const e = this.getDataValue('endDate');
            if (!s || !e) return null;
            const years = (new Date(e) - new Date(s)) / (365.25 * 24 * 3600 * 1000);
            return years > 0 ? Math.max(1, Math.round(years)) : null;
        }
    }
}, {
    tableName: 'Projects',
    timestamps: true,
    paranoid: false
});

module.exports = Project;
