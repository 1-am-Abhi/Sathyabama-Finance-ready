const { User } = require('../src/models');
const { sequelize } = require('../src/config/db');

async function deleteDemoFaculty() {
    try {
        await sequelize.authenticate();
        console.log('Connected to database');
        
        const result = await User.destroy({
            where: {
                [sequelize.Sequelize.Op.or]: [
                    { email: 'faculty@sathyabama.ac.in' },
                    { name: 'Sample Faculty' }
                ]
            }
        });
        
        console.log(`Deleted ${result} demo faculty records.`);
        process.exit(0);
    } catch (error) {
        console.error('Error deleting demo faculty:', error);
        process.exit(1);
    }
}

deleteDemoFaculty();
