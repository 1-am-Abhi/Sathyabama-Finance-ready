const { sequelize } = require('../config/db');
const { Sequelize } = require('sequelize');
const ResearchCenterModel = require('./ResearchCenter');

const models = {
    Account: require('./Account'),
    AccountingPeriod: require('./AccountingPeriod'),
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
    JournalEntry: require('./JournalEntry'),
    Ledger: require('./Ledger'),
    LedgerSnapshot: require('./LedgerSnapshot'),
    UploadedFile: require('./UploadedFile'),
    Notification: require('./Notification'),
    ODRequest: require('./ODRequest'),
    PFMSTransaction: require('./PFMSTransaction'),
    Project: require('./Project'),
    ProjectMember: require('./ProjectMember'),
    ResearchCenter: ResearchCenterModel,
    Revenue: require('./Revenue'),
    User: require('./User'),
    Organization: require('./Organization'),
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
    JournalEntry,
    Ledger,
    LedgerSnapshot,
    Account,
    AccountingPeriod,
    Notification,
    ODRequest,
    PFMSTransaction,
    Project,
    ProjectMember,
    ResearchCenter,
    Revenue,
    User,
    Organization,
} = models;

// Organization relations
Organization.hasMany(User, { foreignKey: 'organizationId', constraints: false });
User.belongsTo(Organization, { foreignKey: 'organizationId', constraints: false });

Organization.hasMany(Project, { foreignKey: 'organizationId', constraints: false });
Project.belongsTo(Organization, { foreignKey: 'organizationId', constraints: false });

Organization.hasMany(FundRequest, { foreignKey: 'organizationId', constraints: false });
FundRequest.belongsTo(Organization, { foreignKey: 'organizationId', constraints: false });

Organization.hasMany(Disbursement, { foreignKey: 'organizationId', constraints: false });
Disbursement.belongsTo(Organization, { foreignKey: 'organizationId', constraints: false });

// Research centre ownership
ResearchCenter.hasMany(User, { foreignKey: 'researchCenterId', as: 'faculty' });
User.belongsTo(ResearchCenter, { foreignKey: 'researchCenterId', as: 'researchCenter' });

ResearchCenter.hasMany(Project, { foreignKey: 'researchCenterId', as: 'projects' });
Project.belongsTo(ResearchCenter, { foreignKey: 'researchCenterId', as: 'researchCenter' });

ResearchCenter.hasMany(FundRequest, { foreignKey: 'researchCenterId', as: 'fundRequests' });
FundRequest.belongsTo(ResearchCenter, { foreignKey: 'researchCenterId', as: 'researchCenter' });

// Project ownership and team membership
Project.belongsTo(User, { foreignKey: 'facultyId', targetKey: '_id', as: 'facultyOwner', constraints: false });
Project.belongsTo(User, { foreignKey: 'userId', targetKey: '_id', as: 'creator', constraints: false });
User.hasMany(Project, { foreignKey: 'facultyId', sourceKey: '_id', as: 'ownedProjects', constraints: false });
User.hasMany(Project, { foreignKey: 'userId', sourceKey: '_id', as: 'createdProjects', constraints: false });

Project.hasMany(ProjectMember, { foreignKey: 'projectId', as: 'members' });
ProjectMember.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });
User.hasMany(ProjectMember, { foreignKey: 'userId', sourceKey: '_id', as: 'projectMemberships', constraints: false });
ProjectMember.belongsTo(User, { foreignKey: 'userId', targetKey: '_id', as: 'user', constraints: false });

Project.belongsToMany(User, {
    through: ProjectMember,
    foreignKey: 'projectId',
    otherKey: 'userId',
    targetKey: '_id',
    as: 'teamMembers',
    constraints: false,
});
User.belongsToMany(Project, {
    through: ProjectMember,
    foreignKey: 'userId',
    otherKey: 'projectId',
    sourceKey: '_id',
    as: 'projects',
    constraints: false,
});

// Core finance pipeline
Project.hasMany(FundRequest, { foreignKey: 'projectId', as: 'fundRequests' });
FundRequest.belongsTo(Project, { foreignKey: 'projectId', as: 'Project' });
User.hasMany(FundRequest, { foreignKey: 'userId', sourceKey: '_id', as: 'fundRequests', constraints: false });
FundRequest.belongsTo(User, { foreignKey: 'userId', targetKey: '_id', as: 'requester', constraints: false });
User.hasMany(FundRequest, { foreignKey: 'facultyId', sourceKey: '_id', as: 'facultyFundRequests', constraints: false });
FundRequest.belongsTo(User, { foreignKey: 'facultyId', targetKey: '_id', as: 'FacultyUser', constraints: false });

FundRequest.hasMany(Disbursement, { foreignKey: 'fundRequestId', as: 'Disbursements' });
FundRequest.hasMany(Disbursement, { foreignKey: 'fundRequestId', as: 'Disbursement' });
Disbursement.belongsTo(FundRequest, { foreignKey: 'fundRequestId', as: 'FundRequest' });
Project.hasMany(Disbursement, { foreignKey: 'projectId', as: 'disbursements' });
Project.hasMany(Disbursement, { foreignKey: 'projectId', as: 'Disbursements' });
Disbursement.belongsTo(Project, { foreignKey: 'projectId', as: 'Project' });
User.hasMany(Disbursement, { foreignKey: 'disbursedBy', sourceKey: '_id', as: 'processedDisbursements', constraints: false });
Disbursement.belongsTo(User, { foreignKey: 'disbursedBy', targetKey: '_id', as: 'officer', constraints: false });

Project.hasMany(PFMSTransaction, { foreignKey: 'projectId', as: 'pfmsTransactions' });
PFMSTransaction.belongsTo(Project, { foreignKey: 'projectId', as: 'Project' });

// Event, OD, equipment, documents, and academic records
User.hasMany(EventRequest, { foreignKey: 'facultyId', sourceKey: '_id', as: 'eventRequests', constraints: false });
EventRequest.belongsTo(User, { foreignKey: 'facultyId', targetKey: '_id', as: 'faculty', constraints: false });
Project.hasMany(EventRequest, { foreignKey: 'projectId', as: 'eventRequests', constraints: false });
EventRequest.belongsTo(Project, { foreignKey: 'projectId', as: 'Project', constraints: false });

User.hasMany(EquipmentRequest, { foreignKey: 'facultyId', sourceKey: '_id', as: 'equipmentRequests', constraints: false });
EquipmentRequest.belongsTo(User, { foreignKey: 'facultyId', targetKey: '_id', as: 'faculty', constraints: false });

User.hasMany(Document, { foreignKey: 'facultyId', sourceKey: '_id', as: 'documents', constraints: false });
Document.belongsTo(User, { foreignKey: 'facultyId', targetKey: '_id', as: 'faculty', constraints: false });

User.hasMany(FacultyRequest, { foreignKey: 'createdBy', sourceKey: '_id', as: 'facultyRequests', constraints: false });
FacultyRequest.belongsTo(User, { foreignKey: 'createdBy', targetKey: '_id', as: 'user', constraints: false });

User.hasMany(ODRequest, { foreignKey: 'facultyId', sourceKey: '_id', as: 'odRequests', constraints: false });
ODRequest.belongsTo(User, { foreignKey: 'facultyId', targetKey: '_id', as: 'faculty', constraints: false });

User.hasMany(AcademicMetric, { foreignKey: 'facultyId', sourceKey: '_id', as: 'academicMetrics', constraints: false });
AcademicMetric.belongsTo(User, { foreignKey: 'facultyId', targetKey: '_id', as: 'faculty', constraints: false });

// Notifications and revenue
User.hasMany(Notification, { foreignKey: 'userId', sourceKey: '_id', as: 'notifications', constraints: false });
Notification.belongsTo(User, { foreignKey: 'userId', targetKey: '_id', as: 'user', constraints: false });

User.hasMany(Revenue, { foreignKey: 'userId', sourceKey: '_id', as: 'revenues', constraints: false });
Revenue.belongsTo(User, { foreignKey: 'userId', targetKey: '_id', as: 'User', constraints: false });
User.hasMany(Revenue, { foreignKey: 'verifiedBy', sourceKey: '_id', as: 'verifiedRevenues', constraints: false });
Revenue.belongsTo(User, { foreignKey: 'verifiedBy', targetKey: '_id', as: 'Verifier', constraints: false });

User.hasMany(InternshipFee, { foreignKey: 'verifiedBy', sourceKey: '_id', as: 'verifiedInternshipFees', constraints: false });
InternshipFee.belongsTo(User, { foreignKey: 'verifiedBy', targetKey: '_id', as: 'verifier', constraints: false });

// Ledger / audit trail
Project.hasMany(Ledger, { foreignKey: 'projectId', as: 'ledgerEntries' });
Ledger.belongsTo(Project, { foreignKey: 'projectId', as: 'Project' });
FundRequest.hasMany(Ledger, { foreignKey: 'fundRequestId', as: 'ledgerEntries' });
Ledger.belongsTo(FundRequest, { foreignKey: 'fundRequestId', as: 'FundRequest' });
Disbursement.hasMany(Ledger, { foreignKey: 'disbursementId', as: 'ledgerEntries' });
Ledger.belongsTo(Disbursement, { foreignKey: 'disbursementId', as: 'Disbursement' });
Revenue.hasMany(Ledger, { foreignKey: 'revenueId', as: 'ledgerEntries' });
Ledger.belongsTo(Revenue, { foreignKey: 'revenueId', as: 'Revenue' });
User.hasMany(Ledger, { foreignKey: 'createdByUserId', sourceKey: '_id', as: 'createdLedgerEntries', constraints: false });
Ledger.belongsTo(User, { foreignKey: 'createdByUserId', targetKey: '_id', as: 'createdByUser', constraints: false });

JournalEntry.hasMany(Ledger, { foreignKey: 'journalId', as: 'ledgerEntries' });
Ledger.belongsTo(JournalEntry, { foreignKey: 'journalId', as: 'JournalEntry' });

Account.hasMany(Ledger, { foreignKey: 'accountId', as: 'ledgerEntries' });
Ledger.belongsTo(Account, { foreignKey: 'accountId', as: 'Account' });

// Audit logs
User.hasMany(AuditLog, { foreignKey: 'userId', sourceKey: '_id', as: 'auditLogs', constraints: false });
AuditLog.belongsTo(User, { foreignKey: 'userId', targetKey: '_id', as: 'user', constraints: false });

models.sequelize = sequelize;
models.Sequelize = Sequelize;

module.exports = models;
