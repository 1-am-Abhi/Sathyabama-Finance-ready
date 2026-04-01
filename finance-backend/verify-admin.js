require('dotenv').config();
const User = require('./src/models/User');

async function verifyAdmin() {
    try {
        const email = 'admin@sathyabama.ac.in';
        const password = 'password123';

        // Check if user exists
        let user = await User.findOne({ where: { email } });

        if (user) {
            console.log(`ℹ️ INFO: Admin user already exists. Updating password to "password123"...`);
            user.password = password; // The beforeSave hook in the model will handle hashing
            user.role = 'ADMIN';
            user.status = 'Active';
            await user.save();
            console.log(`✅ SUCCESS: Admin password reset to "password123"!`);
        } else {
            console.log(`ℹ️ INFO: Admin user NOT found. Creating...`);
            user = await User.create({
                name: 'Administrator',
                email: email,
                password: password,
                role: 'ADMIN',
                department: 'ADMINISTRATION',
                status: 'Active'
            });
            console.log(`✅ SUCCESS: Admin user created with password "password123"!`);
        }
    } catch (error) {
        console.error('❌ ERROR checking/creating admin user:', error);
    } finally {
        process.exit();
    }
}

verifyAdmin();
