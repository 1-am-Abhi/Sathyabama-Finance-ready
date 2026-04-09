const test = require('node:test');
const assert = require('node:assert/strict');

test('express app loads successfully', () => {
    const app = require('../src/app');
    assert.equal(typeof app, 'function');
});

test('health endpoint is registered', () => {
    const app = require('../src/app');
    const stack = app.router?.stack || app._router?.stack || [];
    const routes = stack
        .map((layer) => layer.route?.path)
        .filter(Boolean);

    assert.ok(routes.includes('/api/health'));
});
