const { connectDB, sequelize } = require('./src/config/db');
const Revenue = require('./src/models/Revenue');
const User = require('./src/models/User');

const testDB = async () => {
    try {
        await connectDB();
        console.log('--- DB Connection Success ---');
        
        // Check if Revenue table exists and we can query it
        const count = await Revenue.count();
        console.log(`Current Revenue records: ${count}`);
        
        console.log('--- Test Finished Successfully ---');
        process.exit(0);
    } catch (error) {
        console.error('--- DB Test Failed ---');
        console.error(error);
        process.exit(1);
    }
};

testDB();
