# Architecture Summary — Sathyabama Research Finance & Event Management System

## Overview

A full-stack, multi-tenant-capable financial workflow engine for a research
university. It digitises the funding lifecycle across three portals — **Faculty**,
**Finance**, and **Admin** — covering research projects, installment-based fund
disbursement, a double-entry ledger, events, OD (on-duty) requests, notifications,
analytics, and AI assistance.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, react-router-dom v7, @tanstack/react-query, Tailwind + shadcn/Radix, recharts, socket.io-client, sonner, axios |
| Backend | Node.js 22, Express 5, Sequelize 6 (PostgreSQL), Socket.IO (+ Redis adapter), BullMQ + Bull (Redis queues), Cloudinary (uploads), Winston + morgan (logging), prom-client (metrics), node-cron |
| AI | Anthropic Claude API (server-side proxy; model configurable, default `claude-opus-4-8`) |
| Database | PostgreSQL |
| Deploy | Render (two web services + managed Postgres + Redis), config in `render.yaml` |

## Repository Layout

```
finance-backend/
  server.js                 # HTTP + Socket.IO bootstrap, health, metrics, worker start
  src/
    app.js                  # Express app: security, CORS, routing, error handling
    config/                 # db, redis, multer, sequelize options
    models/                 # Sequelize models (index.js defines associations)
    routes/                 # *Routes.js (auto-mounted by routeHelper)
    controllers/            # request handlers
    services/               # financePipelineService (core), notification, analytics, ai proxy...
    middleware/             # auth, orgScope, dbReady, rate limiters, upload, sanitizer
    jobs/                   # cron: snapshotJob, reportScheduler, proofDeadlineJob
    queues/ workers/        # BullMQ disbursement queue + worker
    utils/                  # logger, identity helpers, installmentProof, validation...
  migrations/               # Sequelize CLI migrations (auto-run on deploy)
  migrations-review/        # reviewable hardening migrations (NOT auto-run)
finance-frontend/
  server.js                 # Express static server for the production build
  src/
    api/client.js           # axios instance (JWT interceptor, cold-start retry)
    routes/index.jsx        # role-gated route tree (lazy-loaded)
    pages/{admin,faculty,finance,shared}/
    components/, contexts/, hooks/, services/
render.yaml                 # Render blueprint for both services
docs/                       # this documentation set
```

## Request Lifecycle (backend)

1. `server.js` creates the HTTP server, wires Socket.IO (JWT-authenticated, per-user
   rooms + a shared `finance` room for FINANCE_OFFICER/ADMIN), starts Prometheus
   metrics, and — after DB connect — seeds default data and starts the BullMQ
   disbursement worker + cron jobs.
2. `src/app.js` is the Express app: helmet, compression, request timeout, CORS
   (locked to `FRONTEND_URL`), request tracing, structured logging, then routes.
3. Routes are mounted explicitly (`/api/projects`, `/api/fund-requests`,
   `/api/finance`) and auto-discovered (`routeHelper.mountRoutes` maps
   `xRoutes.js` → `/x`, mounted at both `/api` and `/api/v1`).
4. A global rate limiter (200 / 15 min) protects `/api/`; sensitive finance routes
   add a dedicated limiter.

## Authentication & Authorization

- **JWT** bearer tokens (7-day expiry) minted at login; verified by `protect`
  middleware, which reloads the user and normalises id fields + `organizationId`.
- **RBAC** via `authorize(...roles)`. Roles: `ADMIN`, `FACULTY`, `FINANCE_OFFICER`,
  `AUDITOR`.
- **Org scoping** via `orgScope` middleware + explicit `organizationId` filters in
  queries (string tenant tag, default `ORG_1`).

## Core Workflows

### Installment / Disbursement (the critical module)

```
Faculty submits Fund Request  ──▶  Admin approves (audit-logged, project → ACTIVE)
   ──▶  Finance disburses  ──▶  enqueued to BullMQ "disbursement" queue
   ──▶  worker runs executeDisbursementPipeline (ONE DB transaction):
          row-locks request+project, idempotency + overpayment guards,
          creates Disbursement, posts balanced double-entry journal
          (Expense debit / Bank credit), updates status, notifies, emits socket.
```

- **Next installment requires a NEW faculty request** — never auto-released.
- **Proof-gating (enforced):** a new installment (N > 1) is blocked until the
  previous installment's utilization (bills/invoices + UC) has been verified by
  Finance (stage → `UTILIZATION_COMPLETED`). See `installmentProof.js`,
  `POST /fund-requests/:id/{proofs,verify-utilization,return-for-correction}`, and
  the daily `proofDeadlineJob` overdue-alert scan.
- **All financial mutations run inside a single Sequelize transaction** with
  `FOR UPDATE` row locks; the ledger is double-entry, hash-chained, and
  period-locked.

### Events & OD

Events follow proposal → approval → funding (college-funded events feed the fund
pipeline) → conduct → proofs → verification → settlement. OD requests follow
apply → approve → proof upload → verification, with ownership guards.

### Ledger

Double-entry (`JournalEntry` header + N `Ledger` lines, Σdebit = Σcredit),
append-only (Sequelize hooks + optional DB triggers in `migrations-review/01`),
SHA-256 hash-chained per entry, and blocked from posting into `CLOSED`
`AccountingPeriod`s.

## Real-time

Socket.IO emits `finance:update` to the `finance` room on every finance action and
`notification` / `notifications:update` to the recipient's user room. The frontend
invalidates the relevant react-query caches on those events (plus polling as a
fallback).

## Observability

- Winston structured JSON logs + morgan HTTP logs, correlation/request IDs.
- Prometheus metrics at `/metrics`.
- Health checks at `/`, `/health`, `/api/health` (DB + Redis status).
- Immutable `AuditLog` for privileged and financial actions.
