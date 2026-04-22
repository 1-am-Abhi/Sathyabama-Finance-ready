const { sequelize } = require('../config/db');
const { Sequelize } = require('sequelize');
const ResearchCenterModel = require('./ResearchCenter');

const models = {
    AcademicMetric: require('./AcademicMetric'),
    AuditLog: require('./AuditLog'),
    Centre: ResearchCenterModel,
    Disbursement: require('./Disbursement'),
    Document: require('./Document'),
    EquipmentRequest: require('./EquipmentRequest'),
    EventRequest: require('./EventRequest'),
    FacultyRequest: require('./FacultyRequest'),
    FundRequest: require('./FundRequest').FundRequest || require('./FundRequest'),
    FundSource: require('./FundSource'),
    InternshipFee: require('./InternshipFee'),
    Ledger: require('./Ledger'),
    Notification: require('./Notification'),
    ODRequest: require('./ODRequest'),
    PFMSTransaction: require('./PFMSTransaction'),
    Project: require('./Project'),
    ProjectMember: require('./ProjectMember'),
    ResearchCenter: ResearchCenterModel,
    Revenue: require('./Revenue'),
    User: require('./User'),
};

const {
    AcademicMetric,
    AuditLog,
    Centre,
    Disbursement,
    Document,
    EquipmentRequest,
    EventRequest,
    FacultyRequest,
    FundRequest,
    InternshipFee,
    Ledger,
    Notification,
    ODRequest,
    PFMSTransaction,
    Project,
    ProjectMember,
    ResearchCenter,
    Revenue,
    User,
} = models;

// Research centre ownership
ResearchCenter.hasMany(User, { foreignKey: 'researchCenterId', as: 'faculty' });
User.belongsTo(ResearchCenter, { foreignKey: 'researchCenterId', as: 'researchCenter' });

ResearchCenter.hasMany(Project, { foreignKey: 'researchCenterId', as: 'projects' });
Project.belongsTo(ResearchCenter, { foreignKey: 'researchCenterId', as: 'researchCenter' });

ResearchCenter.hasMany(FundRequest, { foreignKey: 'researchCenterId', as: 'fundRequests' });
FundRequest.belongsTo(ResearchCenter, { foreignKey: 'researchCenterId', as: 'researchCenter' });

// Project ownership and team membership
Project.belongsTo(User, { foreignKey: 'facultyId', as: 'facultyOwner' });
Project.belongsTo(User, { foreignKey: 'userId', as: 'creator' });
User.hasMany(Project, { foreignKey: 'facultyId', as: 'ownedProjects' });
User.hasMany(Project, { foreignKey: 'userId', as: 'createdProjects' });

Project.hasMany(ProjectMember, { foreignKey: 'projectId', as: 'members' });
ProjectMember.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });
User.hasMany(ProjectMember, { foreignKey: 'userId', as: 'projectMemberships' });
ProjectMember.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Project.belongsToMany(User, {
    through: ProjectMember,
    foreignKey: 'projectId',
    otherKey: 'userId',
    as: 'teamMembers',
});
User.belongsToMany(Project, {
    through: ProjectMember,
    foreignKey: 'userId',
    otherKey: 'projectId',
    as: 'projects',
});

// Core finance pipeline
Project.hasMany(FundRequest, { foreignKey: 'projectId', as: 'fundRequests' });
FundRequest.belongsTo(Project, { foreignKey: 'projectId', as: 'Project' });
User.hasMany(FundRequest, { foreignKey: 'userId', as: 'fundRequests' });
FundRequest.belongsTo(User, { foreignKey: 'userId', as: 'requester' });

FundRequest.hasOne(Disbursement, { foreignKey: 'fundRequestId', as: 'disbursement' });
Disbursement.belongsTo(FundRequest, { foreignKey: 'fundRequestId', as: 'FundRequest' });
Project.hasMany(Disbursement, { foreignKey: 'projectId', as: 'disbursements' });
Disbursement.belongsTo(Project, { foreignKey: 'projectId', as: 'Project' });
User.hasMany(Disbursement, { foreignKey: 'disbursedBy', as: 'processedDisbursements' });
Disbursement.belongsTo(User, { foreignKey: 'disbursedBy', as: 'officer' });

Project.hasMany(PFMSTransaction, { foreignKey: 'projectId', as: 'pfmsTransactions' });
PFMSTransaction.belongsTo(Project, { foreignKey: 'projectId', as: 'Project' });

// Event, OD, equipment, documents, and academic records
User.hasMany(EventRequest, { foreignKey: 'facultyId', as: 'eventRequests' });
EventRequest.belongsTo(User, { foreignKey: 'facultyId', as: 'faculty' });

User.hasMany(EquipmentRequest, { foreignKey: 'facultyId', as: 'equipmentRequests' });
EquipmentRequest.belongsTo(User, { foreignKey: 'facultyId', as: 'faculty' });

User.hasMany(Document, { foreignKey: 'facultyId', as: 'documents' });
Document.belongsTo(User, { foreignKey: 'facultyId', as: 'faculty' });

User.hasMany(FacultyRequest, { foreignKey: 'createdBy', as: 'facultyRequests' });
FacultyRequest.belongsTo(User, { foreignKey: 'createdBy', as: 'user' });

User.hasMany(ODRequest, { foreignKey: 'facultyId', as: 'odRequests' });
ODRequest.belongsTo(User, { foreignKey: 'facultyId', as: 'faculty' });

User.hasMany(AcademicMetric, { foreignKey: 'facultyId', as: 'academicMetrics' });
AcademicMetric.belongsTo(User, { foreignKey: 'facultyId', as: 'faculty' });

// Notifications and revenue
User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(Revenue, { foreignKey: 'userId', as: 'revenues' });
Revenue.belongsTo(User, { foreignKey: 'userId', as: 'User' });
User.hasMany(Revenue, { foreignKey: 'verifiedBy', as: 'verifiedRevenues' });
Revenue.belongsTo(User, { foreignKey: 'verifiedBy', as: 'Verifier' });

User.hasMany(InternshipFee, { foreignKey: 'verifiedBy', as: 'verifiedInternshipFees' });
InternshipFee.belongsTo(User, { foreignKey: 'verifiedBy', as: 'verifier' });

// Ledger / audit trail
Project.hasMany(Ledger, { foreignKey: 'projectId', as: 'ledgerEntries' });
Ledger.belongsTo(Project, { foreignKey: 'projectId', as: 'Project' });
FundRequest.hasMany(Ledger, { foreignKey: 'fundRequestId', as: 'ledgerEntries' });
Ledger.belongsTo(FundRequest, { foreignKey: 'fundRequestId', as: 'FundRequest' });
Disbursement.hasMany(Ledger, { foreignKey: 'disbursementId', as: 'ledgerEntries' });
Ledger.belongsTo(Disbursement, { foreignKey: 'disbursementId', as: 'Disbursement' });
Revenue.hasMany(Ledger, { foreignKey: 'revenueId', as: 'ledgerEntries' });
Ledger.belongsTo(Revenue, { foreignKey: 'revenueId', as: 'Revenue' });
User.hasMany(Ledger, { foreignKey: 'createdByUserId', as: 'createdLedgerEntries' });
Ledger.belongsTo(User, { foreignKey: 'createdByUserId', as: 'createdByUser' });

// Audit logs
User.hasMany(AuditLog, { foreignKey: 'userId', as: 'auditLogs' });
AuditLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

models.sequelize = sequelize;
models.Sequelize = Sequelize;

module.exports = models;
