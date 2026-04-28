const { Account } = require('../models');
const { ACCOUNTS } = require('../constants/accounts');

const seedAccounts = async () => {
    console.log('[AccountSeed] Synchronizing Chart of Accounts...');
    
    for (const key in ACCOUNTS) {
        const accountData = ACCOUNTS[key];
        try {
            await Account.findOrCreate({
                where: { code: accountData.code },
                defaults: accountData
            });
        } catch (err) {
            console.error(`[AccountSeed] Failed to seed ${accountData.name}:`, err.message);
        }
    }
    
    console.log('[AccountSeed] Chart of Accounts synchronization complete.');
};

module.exports = seedAccounts;
