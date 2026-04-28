const { FundRequest, Disbursement, AuditLog, Project, User } = require('../src/models');
const { executeDisbursementPipeline } = require('../src/services/financePipelineService');
const { connectDB, sequelize } = require('../src/config/db');

const runSmokeTest = async () => {
    console.log("=== Starting Disbursement Smoke Test ===");

    try {
        await connectDB();

        // 1. Setup mock data
        const adminUser = await User.findOne({ where: { role: 'ADMIN' } });
        if (!adminUser) {
            console.warn("No admin user found, skipping smoke test.");
            process.exit(0);
        }

        const project = await Project.create({
            title: `Smoke Test Project ${Date.now()}`,
            description: 'Smoke Test Description',
            pi: 'Smoke Test PI',
            department: 'Smoke Test Department',
            fundingSource: 'INSTITUTIONAL',
            sanctionedBudget: 100000,
            releasedBudget: 0,
            status: 'ACTIVE'
        });

        const request = await FundRequest.create({
            projectId: project._id,
            projectTitle: project.title,
            userId: adminUser._id,
            faculty: 'Smoke Test PI',
            department: 'Smoke Test Department',
            requestedAmount: 50000,
            status: 'PENDING_DISBURSAL',
            source: 'INSTITUTIONAL',
            purpose: 'Testing',
            currentStage: 'FUND_APPROVED'
        });

        await AuditLog.create({
            userId: adminUser._id,
            action: 'FUND_APPROVED',
            entityType: 'FundRequest',
            entityId: String(request._id),
            metadata: { updatedByName: 'Smoke Test Admin' }
        });

        // 2. Disburse partial
        console.log("-> Disbursing Partial (₹20,000)");
        await executeDisbursementPipeline(request, {
            amount: 20000,
            transactionId: `UTR-SMOKE-${Date.now()}-1`,
            mode: 'INSTALLMENT'
        }, adminUser, { correlationId: 'SMOKE-TEST-1' });

        // 3. Disburse remaining
        console.log("-> Disbursing Remaining (₹30,000)");
        const refreshedRequest = await FundRequest.findByPk(request._id);
        await executeDisbursementPipeline(refreshedRequest, {
            amount: 30000,
            transactionId: `UTR-SMOKE-${Date.now()}-2`,
            mode: 'INSTALLMENT'
        }, adminUser, { correlationId: 'SMOKE-TEST-2' });

        // 4. Fetch history & Validate
        console.log("-> Validating Final State");
        const finalRequest = await FundRequest.findByPk(request._id);
        const disbursements = await Disbursement.findAll({ where: { fundRequestId: request._id } });

        const totalReleased = disbursements.reduce((sum, d) => sum + Number(d.amount), 0);
        const remaining = Number(finalRequest.requestedAmount) - totalReleased;

        if (disbursements.length !== 2) {
            throw new Error(`Expected 2 disbursements, found ${disbursements.length}`);
        }
        if (remaining !== 0) {
            throw new Error(`Expected remaining = 0, found ${remaining}`);
        }
        if (finalRequest.status !== 'DISBURSED') {
            throw new Error(`Expected status = DISBURSED, found ${finalRequest.status}`);
        }

        console.log("✅ SMOKE TEST PASSED: All idempotency and state validations successful.");
    } catch (err) {
        console.error("❌ SMOKE TEST FAILED:", err.message);
        process.exit(1);
    } finally {
        await sequelize.close();
        process.exit(0);
    }
};

runSmokeTest();
