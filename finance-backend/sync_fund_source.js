const { sequelize } = require('./src/config/db');
const FundSource = require('./src/models/FundSource');

const syncFundSource = async () => {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB...');
        
        // Sync ONLY the new FundSource table WITHOUT touching other tables
        await FundSource.sync({ alter: true });
        console.log('FundSource table created or updated successfully!');
        
        process.exit(0);
    } catch (error) {
        console.error('Error syncing FundSource:', error);
        process.exit(1);
    }
};

syncFundSource();
