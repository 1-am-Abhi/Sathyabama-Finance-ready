const { sequelize } = require('./src/config/db');

async function testConnection() {
    try {
        await sequelize.authenticate();
        console.log('✅ Connection to Render PostgreSQL has been established successfully.');
        
        // Count users as a quick check
        const [results] = await sequelize.query('SELECT count(*) FROM "Users"');
        console.log('📊 Total Users in Render DB:', results[0].count);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Unable to connect to the Render database:', error);
        process.exit(1);
    }
}

testConnection();
