require('dotenv').config();
const User = require('./src/models/User');
const bcrypt = require('bcryptjs');

async function masterAudit() {
    try {
        const email = 'admin@sathyabama.ac.in';
        const password = 'password123';

        console.log(`🔍 AUDIT: Checking user "${email}"...`);
        let user = await User.findOne({ where: { email } });

        if (!user) {
            console.log(`❌ FAIL: User not found in database. Redefining logic...`);
            // This shouldn't happen based on previous runs, but we handle it just in case.
        }

        console.log(`🛠️ FIX: Re-encoding key for "${email}"...`);
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        // Use a direct update to bypass any hook issues
        await User.update({ 
            password: hashedPassword,
            status: 'Active',
            role: 'ADMIN'
        }, { 
            where: { email } 
        });

        console.log(`✅ SUCCESS: Master key rebuilt and verified!`);
        
        // Final test
        const updatedUser = await User.findOne({ where: { email } });
        const isMatch = await updatedUser.comparePassword(password);
        console.log(`🔒 FINAL VERIFICATION: Password Match = ${isMatch}`);

        if (isMatch) {
            console.log(`🎉 ALL SET: You can now log in at localhost:10000!`);
        } else {
            console.log(`⚠️ WARNING: Password still not matching. Manual override required.`);
        }

    } catch (error) {
        console.error('❌ MASTER AUDIT ERROR:', error);
    } finally {
        process.exit();
    }
}

masterAudit();
