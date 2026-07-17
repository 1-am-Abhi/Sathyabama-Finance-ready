# Environment Variables

## Backend (`finance-backend`)

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection string (use Render Internal string; append `?ssl=true` as needed) |
| `JWT_SECRET` | **Yes** | — | Secret for signing JWTs (Render auto-generates) |
| `NODE_ENV` | Yes | `development` | `production` enables Redis, the real BullMQ queue/worker, and prod DB pool settings |
| `PORT` | No | `5000` | HTTP port |
| `HOST` | No | `0.0.0.0` in prod | Bind address |
| `FRONTEND_URL` | **Yes (prod)** | — | Allowed CORS origin |
| `REDIS_URL` | **Yes (prod)** | — | Redis for Socket.IO adapter + BullMQ; `rediss://` for TLS |
| `DB_POOL_MAX` / `DB_POOL_MIN` | No | `2` / `0` | Sequelize pool sizing |
| `DB_RETRY_MAX` | No | `3` | DB connect retries |
| `DB_SYNC` | No | `false` | Must stay `false` in prod (migrations manage schema) |
| `DB_SSL` | No | auto | Auto-detects (SSL on for managed PG, off for localhost). Set `false` to force-disable. |
| `ANTHROPIC_API_KEY` | No | — | Enables the AI features; without it AI endpoints return 503 `AI_UNAVAILABLE` |
| `AI_MODEL` | No | `claude-opus-4-8` | Override the Claude model used by the AI proxy |
| `PROOF_GATING_ENABLED` | No | `true` | Enforce installment proof-gating; set `false` to disable |
| `PROOF_DEADLINE_DAYS` | No | `30` | Days after disbursement before proofs are flagged overdue |
| `SCOPUS_API_KEY` | No | — | Scopus integration (academic metrics), if used |
| `CHAOS_MODE` | No | — | Dev-only fault injection (never set in prod) |

## Frontend (`finance-frontend`)

Build-time (CRA embeds these at `npm run build`):

| Variable | Required | Purpose |
|---|---|---|
| `REACT_APP_API_URL` | **Yes** | Backend base URL **including the `/api` suffix** (the axios client uses it verbatim). Missing → the app throws at load. |
| `REACT_APP_GOOGLE_API_KEY` | No | Google Calendar integration on admin OD/Event pages |
| `PORT` | No | Port for the production Express static server (`server.js`) |

> ⚠️ The committed `finance-frontend/.env` (which contained a live Google API key)
> was removed from version control. **Rotate that key** and set values via the
> Render dashboard / `.env.production` instead. The key still exists in git
> history — scrub it (e.g. `git filter-repo`) or, at minimum, rotate it.

## Local development

```bash
# backend/.env  (do NOT commit; .env is gitignored)
DATABASE_URL=postgres://localhost:5432/finance_dev
JWT_SECRET=dev-secret
NODE_ENV=development          # Redis + BullMQ disabled; disbursement runs synchronously
FRONTEND_URL=http://localhost:3000
# ANTHROPIC_API_KEY=sk-ant-...   # optional, to test AI locally

# frontend/.env
REACT_APP_API_URL=http://localhost:5000/api   # NOTE the /api suffix
```

Run both with `npm run dev` from the repo root (concurrently starts frontend +
backend). In development, Redis is disabled and disbursements execute
synchronously in-process, so no Redis is required locally.
