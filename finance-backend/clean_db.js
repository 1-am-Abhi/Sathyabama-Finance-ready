const { sequelize } = require('./src/config/db');
const User = require('./src/models/User');
const Project = require('./src/models/Project');
const { FundRequest } = require('./src/models/FundRequest');
const EventRequest = require('./src/models/EventRequest');
const ODRequest = require('./src/models/ODRequest');
const Notification = require('./src/models/Notification');
const AcademicMetric = require('./src/models/AcademicMetric');
const Revenue = require('./src/models/Revenue');
const Document = require('./src/models/Document');
const EquipmentRequest = require('./src/models/EquipmentRequest');
const InternshipFee = require('./src/models/InternshipFee');
const PFMSTransaction = require('./src/models/PFMSTransaction');
const ProjectMember = require('./src/models/ProjectMember');

const cleanDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('Connected to Database for cleaning...');

        // We use truncate with cascade to handle foreign keys
        // Alternatively, we can just call .destroy({ where: {}, cascade: true }) on each
        
        const modelsToClear = [
            PFMSTransaction,
            InternshipFee,
            EquipmentRequest,
            Document,
            Revenue,
            AcademicMetric,
            Notification,
            ODRequest,
            EventRequest,
            FundRequest,
            ProjectMember,
            Project
        ];

        console.log(`Clearing ${modelsToClear.length} tables...`);
        
        // Disable foreign key checks for the truncate process if needed, 
        // but Sequelize .destroy with where {} is safer if hooks are needed, 
        // though TRUNCATE is faster.
        
        for (const model of modelsToClear) {
            const tableName = model.tableName || model.name;
            console.log(`Clearing ${tableName}...`);
            await model.destroy({ where: {}, cascade: true, force: true });
        }

        const userCount = await User.count();
        console.log(`Database cleaned. Kept ${userCount} users.`);
        
        process.exit(0);
    } catch (error) {
        console.error('Cleaning failed:', error);
        process.exit(1);
    }
};

cleanDB();
