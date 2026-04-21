const { getAdminDashboardData } = require('./src/services/pipelineMetricsService');
const models = require('./src/models');

async function test() {
  try {
    const data = await getAdminDashboardData();
    console.log(JSON.stringify(data.stats, null, 2));
    console.log('Total Projects:', data.shared.projects.length);
    console.log('Recent Requests:', data.shared.fundRequests.length);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

test();
