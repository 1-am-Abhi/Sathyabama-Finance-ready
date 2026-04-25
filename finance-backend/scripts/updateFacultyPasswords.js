const { User } = require('../src/models');
const { sequelize } = require('../src/config/db');

async function updatePasswords() {
    try {
        await sequelize.authenticate();
        console.log('Connected to database.');

        const faculties = await User.findAll({ where: { role: 'FACULTY' } });
        let count = 0;

        for (const faculty of faculties) {
            faculty.password = 'Password@2026';
            await faculty.save(); // triggers beforeSave hook which hashes the password
            count++;
        }

        console.log(`Updated password for ${count} faculty members to 'Password@2026'.`);
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

updatePasswords();
