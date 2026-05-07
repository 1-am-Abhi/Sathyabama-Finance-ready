#!/usr/bin/env node

require('dotenv').config();

const BASE_URL = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:5010';

async function httpCall(label, method, path, token, body) {
  const url = BASE_URL + path;
  const headers = {};

  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text.slice(0, 200);
  }

  const isHardFailure =
    res.status >= 500 ||
    (data &&
      data.success === false &&
      !['missing-report-range'].includes(label));

  if (isHardFailure) {
    throw new Error(`${label} failed: HTTP ${res.status} ${text.slice(0, 500)}`);
  }

  return { label, status: res.status, data };
}

async function login(email, password) {
  const result = await httpCall(
    `login-${email}`,
    'POST',
    '/api/auth/login',
    null,
    { email, password }
  );

  if (!result.data?.success || !result.data?.data?.token) {
    throw new Error(`Login failed for ${email}`);
  }

  return result.data.data.token;
}

async function run() {
  const stamp = Date.now();
  const summary = [];

  function record(label, method, path, token, body) {
    return httpCall(label, method, path, token, body).then((result) => {
      const d = result.data;
      summary.push({
        label,
        status: result.status,
        success: d?.success,
        health: d?.data?.status || d?.status,
        count: d?.count ?? (Array.isArray(d?.data) ? d.data.length : undefined),
      });
      return d;
    });
  }

  const adminToken = await login('admin@sathyabama.ac.in', 'Admin@123');
  const facultyToken = await login('faculty@sathyabama.ac.in', 'Faculty@123');
  const financeToken = await login('finance@sathyabama.ac.in', 'Finance@123');

  await record('public-health', 'GET', '/health');
  await record('api-health', 'GET', '/api/health');

  const financeHealth = await record(
    'finance-health',
    'GET',
    '/api/finance/health',
    adminToken
  );

  if (financeHealth?.data?.status !== 'GREEN') {
    throw new Error(`Finance health not GREEN: ${JSON.stringify(financeHealth)}`);
  }

  const projectPayload = {
    title: `HTTP Smoke Project ${stamp}`,
    description: 'Created by HTTP smoke test',
    sanctionedBudget: 75000,
    fundingSource: 'INSTITUTIONAL',
  };

  const projectRes = await record(
    'project-create',
    'POST',
    '/api/projects',
    facultyToken,
    projectPayload
  );

  const projectId = projectRes?.data?.id || projectRes?.data?._id;
  if (!projectId) {
    throw new Error('Project ID missing in project-create response');
  }

  const fundReqRes = await record(
    'fund-request-create',
    'POST',
    '/api/fund-requests',
    facultyToken,
    {
      projectTitle: projectPayload.title,
      requestedAmount: 12000,
      purpose: 'HTTP smoke fund request purpose',
      source: 'INSTITUTIONAL',
      projectId,
    }
  );

  const fundRequestId = fundReqRes?.data?.id || fundReqRes?.data?._id;
  if (!fundRequestId) {
    throw new Error('Fund request ID missing in fund-request-create response');
  }

  await record('fund-request-list', 'GET', '/api/fund-requests', adminToken);
  await record(
    'fund-request-detail',
    'GET',
    `/api/fund-requests/${fundRequestId}`,
    adminToken
  );

  await record(
    'fund-request-approve',
    'PUT',
    `/api/fund-requests/${fundRequestId}/approve`,
    adminToken,
    { remarks: 'approved by HTTP smoke' }
  );

  await record(
    'fund-request-disburse',
    'POST',
    `/api/fund-requests/${fundRequestId}/disburse`,
    financeToken,
    {
      amount: 5000,
      paymentMode: 'NEFT',
      transactionId: `HTTP-TXN-${stamp}`,
      referenceId: `HTTP-REF-${stamp}`,
      bankName: 'HTTP Bank',
      remarks: 'HTTP smoke disbursement',
    }
  );

  await record('project-detail', 'GET', `/api/projects/${projectId}`, adminToken);
  await record(
    'project-installments',
    'GET',
    `/api/fund-requests/project/${projectId}`,
    adminToken
  );

  await record('finance-stats', 'GET', '/api/finance/stats', adminToken);
  await record('finance-dashboard', 'GET', '/api/finance/dashboard', adminToken);
  await record(
    'finance-fund-sources',
    'GET',
    '/api/finance/fund-sources/overview',
    adminToken
  );
  await record('finance-departments', 'GET', '/api/finance/departments', adminToken);
  await record('finance-fund-flow', 'GET', '/api/finance/fund-flow', adminToken);
  await record(
    'finance-disbursal-history',
    'GET',
    '/api/finance/disbursal-history',
    adminToken
  );
  await record(
    'finance-reports-data',
    'GET',
    '/api/finance/reports-data',
    adminToken
  );
  await record(
    'finance-financial-reports',
    'GET',
    '/api/finance/financial-reports?startDate=2026-01-01&endDate=2026-12-31',
    adminToken
  );
  await record(
    'finance-trial-balance',
    'GET',
    '/api/finance/statements/trial-balance',
    adminToken
  );
  await record(
    'finance-profit-loss',
    'GET',
    '/api/finance/statements/profit-loss',
    adminToken
  );
  await record(
    'finance-balance-sheet',
    'GET',
    '/api/finance/statements/balance-sheet',
    adminToken
  );
  await record(
    'finance-ledger-verify',
    'GET',
    '/api/finance/ledger/verify',
    adminToken
  );
  await record('finance-projects', 'GET', '/api/finance/projects', adminToken);
  await record(
    'finance-project-detail',
    'GET',
    `/api/finance/projects/${projectId}`,
    adminToken
  );

  const docCreate = await record(
    'document-create',
    'POST',
    '/api/documents',
    facultyToken,
    {
      fileName: 'smoke.pdf',
      fileType: 'application/pdf',
      documentType: 'UTILIZATION',
      projectName: projectPayload.title,
      description: 'HTTP smoke document',
      fileData: 'c21va2U=',
    }
  );

  const docId = docCreate?.data?.id || docCreate?.data?._id;
  if (!docId) {
    throw new Error('Document ID missing in document-create response');
  }

  await record('document-list', 'GET', '/api/documents', adminToken);
  await record(
    'document-status',
    'PUT',
    `/api/documents/${docId}/status`,
    adminToken,
    { status: 'VERIFIED', adminRemarks: 'ok' }
  );

  console.log(JSON.stringify({ success: true, checked: summary }, null, 2));
}

run().catch((err) => {
  console.error('[finance-smoke] FAILED:', err.message);
  process.exit(1);
});