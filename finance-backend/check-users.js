const { sequelize } = require('./src/config/db');

async function checkUsers() {
    try {
        await sequelize.authenticate();
        console.log('✅ Connected to Render DB');
        
        // Count users first
        const [count] = await sequelize.query('SELECT count(*) FROM "Users"');
        console.log('📊 Count:', count[0].count);

        const [users] = await sequelize.query('SELECT email, password, role FROM "Users"');
        console.log(JSON.stringify(users, null, 2));
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkUsers();
