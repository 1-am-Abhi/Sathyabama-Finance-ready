const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const AcademicMetric = sequelize.define('AcademicMetric', {
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
        allowNull: true
    },
    cycle: {
        type: DataTypes.STRING,
        defaultValue: '2024-25'
    },
    status: {
        type: DataTypes.ENUM('APPROVED', 'PENDING_APPROVAL', 'REJECTED'),
        defaultValue: 'APPROVED' // Default to approved for legacy/sync, but manual updates will be PENDING
    },
    remarks: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    // Section A: Quantitative
    theorySubjects: { type: DataTypes.INTEGER, defaultValue: 0 },
    practicalSubjects: { type: DataTypes.INTEGER, defaultValue: 0 },
    ugProjects: { type: DataTypes.INTEGER, defaultValue: 0 },
    pgProjects: { type: DataTypes.INTEGER, defaultValue: 0 },
    internships: { type: DataTypes.INTEGER, defaultValue: 0 },
    examDuty: { type: DataTypes.INTEGER, defaultValue: 0 },
    phdOngoing: { type: DataTypes.INTEGER, defaultValue: 0 },
    phdCompleted: { type: DataTypes.INTEGER, defaultValue: 0 },
    
    // Section B: Qualitative
    // Scopus & Publication Metrics
    journals: { type: DataTypes.INTEGER, defaultValue: 0 },
    proceedings: { type: DataTypes.INTEGER, defaultValue: 0 },
    books: { type: DataTypes.INTEGER, defaultValue: 0 },
    bookChapters: { type: DataTypes.INTEGER, defaultValue: 0 },
    patents: { type: DataTypes.INTEGER, defaultValue: 0 },

    // Institutional Outcomes (CEER Paper tracking)
    products: { type: DataTypes.INTEGER, defaultValue: 0 },
    startups: { type: DataTypes.INTEGER, defaultValue: 0 },
    mous: { type: DataTypes.INTEGER, defaultValue: 0 },
    editorialRole: { type: DataTypes.INTEGER, defaultValue: 0 },
    internationalVisit: { type: DataTypes.INTEGER, defaultValue: 0 }, // Changed to INT to match spreadsheet tracking 
    fellowship: { type: DataTypes.TEXT, allowNull: true, defaultValue: '' },
    coordinators: { type: DataTypes.TEXT, allowNull: true, defaultValue: '' },
    grants: { type: DataTypes.TEXT, allowNull: true, defaultValue: '' }
});

module.exports = AcademicMetric;
