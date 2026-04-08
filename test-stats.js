const { sequelize } = require('./finance-backend/src/config/db');
const projectController = require('./finance-backend/src/controllers/projectController');

async function test() {
    await sequelize.authenticate();
    const req = { user: { role: 'ADMIN' } };
    const res = {
        status: function(code) { return this; },
        json: function(data) { console.log(JSON.stringify(data, null, 2)); }
    };
    await projectController.getAdminStats(req, res);
    process.exit(0);
}
test();
