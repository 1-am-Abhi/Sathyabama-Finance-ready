const test = require('node:test');
const assert = require('node:assert/strict');

const financeRoutes = require('../src/routes/financeRoutes');
const notificationRoutes = require('../src/routes/notificationRoutes');
const projectRoutes = require('../src/routes/projectRoutes');
const {
    normalizeFundRequest,
    normalizeDisbursement,
} = require('../src/services/pipelineMetricsService');

test('project routes expose stats endpoints', () => {
    const paths = projectRoutes.stack.map((layer) => layer.route?.path).filter(Boolean);

    assert.ok(paths.includes('/stats'));
    assert.ok(paths.includes('/faculty-stats'));
});

test('finance routes expose disbursement pipeline endpoints', () => {
    const paths = financeRoutes.stack.map((layer) => layer.route?.path).filter(Boolean);

    assert.ok(paths.includes('/disbursements'));
    assert.ok(paths.includes('/disbursal-history'));
    assert.ok(paths.includes('/equipment-disbursements'));
    assert.ok(paths.includes('/dashboard'));
    assert.ok(paths.includes('/funds/update'));
});

test('notification routes expose read sync endpoints', () => {
    const paths = notificationRoutes.stack.map((layer) => layer.route?.path).filter(Boolean);

    assert.ok(paths.includes('/:userId'));
    assert.ok(paths.includes('/mark-all-read'));
    assert.ok(paths.includes('/mark-all-read/:userId'));
});

test('normalizeFundRequest preserves nested project data expected by the frontend', () => {
    const normalized = normalizeFundRequest({
        _id: 'request-1',
        projectTitle: 'Legacy Title',
        faculty: 'Legacy PI',
        requestedAmount: 125000,
        Project: {
            _id: 'project-1',
            title: 'Actual Project',
            pi: 'Dr. Faculty',
            department: 'Research',
            researchCentre: { _id: 'centre-1', name: 'Centre of Excellence for Energy Research' },
        },
    });

    assert.equal(normalized.id, 'request-1');
    assert.equal(normalized.amount, 125000);
    assert.equal(normalized.Project.id, 'project-1');
    assert.equal(normalized.Project.title, 'Actual Project');
    assert.equal(normalized.Project.pi, 'Dr. Faculty');
    assert.equal(normalized.projectTitle, 'Actual Project');
    assert.equal(normalized.faculty, 'Dr. Faculty');
});

test('normalizeDisbursement exposes nested FundRequest and Project summaries', () => {
    const normalized = normalizeDisbursement({
        _id: 'disb-1',
        amount: 50000,
        FundRequest: {
            _id: 'request-1',
            projectTitle: 'Grant Request',
            faculty: 'Dr. Faculty',
            source: 'PFMS',
        },
        Project: {
            _id: 'project-1',
            title: 'Grant Project',
            pi: 'Dr. Faculty',
        },
    });

    assert.equal(normalized.id, 'disb-1');
    assert.equal(normalized.amount, 50000);
    assert.equal(normalized.FundRequest.id, 'request-1');
    assert.equal(normalized.Project.id, 'project-1');
    assert.equal(normalized.projectTitle, 'Grant Project');
    assert.equal(normalized.faculty, 'Dr. Faculty');
});
