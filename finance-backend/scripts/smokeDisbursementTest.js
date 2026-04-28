const { FundRequest, Disbursement, AuditLog, Project, User } = require('../src/models');
const { executeDisbursementPipeline } = require('../src/services/financePipelineService');
const { connectDB, sequelize } = require('../src/config/db');

const runSmokeTest = async () => {
    console.log("=== Starting Disbursement Smoke Test (Installment-Request Model) ===");

    try {
        await connectDB();

        const adminUser = await User.findOne({ where: { role: 'ADMIN' } });
        if (!adminUser) {
            console.warn("No admin user found, skipping smoke test.");
            process.exit(0);
        }

        // ── 1. Create project with ₹5,00,000 budget ────────────────────────
        const project = await Project.create({
            title: `Smoke Test Project ${Date.now()}`,
            description: 'Smoke Test Description',
            pi: adminUser.name || 'Test PI',
            department: adminUser.department || 'Research',
            fundingSource: 'INSTITUTIONAL',
            sanctionedBudget: 500000,
            releasedBudget: 0,
            status: 'ACTIVE'
        });

        // ── 2. Request #1: ₹50,000 ──────────────────────────────────────────
        const request1 = await FundRequest.create({
            projectId: project._id,
            projectTitle: project.title,
            userId: adminUser._id,
            faculty: adminUser.name || 'Test PI',
            department: adminUser.department || 'Research',
            requestedAmount: 50000,
            installmentNumber: 1,
            type: 'INSTALLMENT',
            status: 'PENDING_DISBURSAL',
            source: 'INSTITUTIONAL',
            purpose: 'Smoke Test Request 1',
            currentStage: 'FUND_APPROVED'
        });

        await AuditLog.create({
            userId: adminUser._id,
            action: 'FUND_APPROVED',
            entityType: 'FundRequest',
            entityId: String(request1._id),
            metadata: { updatedByName: 'Smoke Test Admin' }
        });

        console.log("-> Disbursing Request #1 (₹50,000)");
        const result1 = await executeDisbursementPipeline(request1, {
            transactionId: `UTR-SMOKE-${Date.now()}-1`,
        }, adminUser, { correlationId: 'SMOKE-TEST-1' });

        if (result1.request.status !== 'DISBURSED') {
            throw new Error(`Expected status = DISBURSED after Request #1, got ${result1.request.status}`);
        }

        // ── 3. Request #2: ₹1,00,000 ────────────────────────────────────────
        const request2 = await FundRequest.create({
            projectId: project._id,
            projectTitle: project.title,
            userId: adminUser._id,
            faculty: adminUser.name || 'Test PI',
            department: adminUser.department || 'Research',
            requestedAmount: 100000,
            installmentNumber: 2,
            type: 'INSTALLMENT',
            status: 'PENDING_DISBURSAL',
            source: 'INSTITUTIONAL',
            purpose: 'Smoke Test Request 2',
            currentStage: 'FUND_APPROVED'
        });

        await AuditLog.create({
            userId: adminUser._id,
            action: 'FUND_APPROVED',
            entityType: 'FundRequest',
            entityId: String(request2._id),
            metadata: { updatedByName: 'Smoke Test Admin' }
        });

        console.log("-> Disbursing Request #2 (₹1,00,000)");
        const result2 = await executeDisbursementPipeline(request2, {
            transactionId: `UTR-SMOKE-${Date.now()}-2`,
        }, adminUser, { correlationId: 'SMOKE-TEST-2' });

        if (result2.request.status !== 'DISBURSED') {
            throw new Error(`Expected status = DISBURSED after Request #2, got ${result2.request.status}`);
        }

        // ── 4. Validate final state ─────────────────────────────────────────
        console.log("-> Validating Final State");

        const disbursements = await Disbursement.findAll({
            where: { projectId: project._id }
        });

        const totalReleased = disbursements.reduce((sum, d) => sum + Number(d.amount), 0);
        const remaining = 500000 - totalReleased;
        const updatedProject = await Project.findByPk(project._id);

        if (disbursements.length !== 2) {
            throw new Error(`Expected 2 disbursements, found ${disbursements.length}`);
        }
        if (totalReleased !== 150000) {
            throw new Error(`Expected totalReleased = ₹1,50,000, got ₹${totalReleased}`);
        }
        if (remaining !== 350000) {
            throw new Error(`Expected remaining = ₹3,50,000, got ₹${remaining}`);
        }
        if (Number(updatedProject.releasedBudget) !== 150000) {
            throw new Error(`Expected project.releasedBudget = 150000, got ${updatedProject.releasedBudget}`);
        }

        // Ensure no PARTIALLY_DISBURSED status exists
        const partial = await FundRequest.findOne({
            where: { status: 'PARTIALLY_DISBURSED' }
        });
        if (partial) {
            throw new Error(`Found PARTIALLY_DISBURSED request — old logic still active!`);
        }

        console.log("✅ SMOKE TEST PASSED:");
        console.log(`   FundRequests   = 2`);
        console.log(`   Disbursements  = 2`);
        console.log(`   Total Released = ₹${totalReleased.toLocaleString()}`);
        console.log(`   Remaining      = ₹${remaining.toLocaleString()}`);
        console.log(`   No PARTIALLY_DISBURSED status found`);

    } catch (err) {
        console.error("❌ SMOKE TEST FAILED:", err.message);
        process.exit(1);
    } finally {
        await sequelize.close();
        process.exit(0);
    }
};

runSmokeTest();
