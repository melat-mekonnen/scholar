# Scholar Backend

Express API and Postgres data layer for **EthioScholar**. Handles authentication, student profiles, scholarships search and bookmarks, applications, community, documents, subscriptions, admin/owner/manager routes, and scholarship ingestion.

For a project overview, Docker quick start, and monorepo layout, see the [root README](../README.md).

## Setup

```bash
cd scholar-backend
npm install
```

Create `.env` from `.env.example` and configure:

| Variable | Purpose |
|----------|---------|
| `PORT` | API port (default `4000`) |
| `DATABASE_URL` | Postgres connection string (Neon or local) |
| `JWT_SECRET` | Signing secret for session tokens |
| `FRONTEND_APP_URL` | Next.js origin (e.g. `http://localhost:3000`) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` | Google OAuth |
| `AI_SERVICE_URL` | Optional; default `http://127.0.0.1:8010` for `scholar-ai` |

Apply the schema from `db/schema.sql`.

### Clean local database (dev only)

If the database has leftover tables from another setup, reset `public` and reapply the canonical schema:

```bash
CONFIRM_DB_RESET=yes npm run db:reset
```

**Never** run this against production or shared databases.

### Test users (role routing)

```bash
npm run seed:test-roles
```

| Role | Landing path after sign-in |
|------|----------------------------|
| student | `/dashboard` |
| manager | `/manager` |
| owner | `/owner` |
| admin | `/admin` |

With the API running:

```bash
npm run verify:role-routing
```

## Run

```bash
npm run dev
```

Server listens on `PORT` (default `4000`).

## Core HTTP API

- **POST `/auth/signup`** — `{ fullName, email, password }` → `{ user, token }`
- **POST `/auth/login`** — same response shape
- **GET `/auth/me`** — `Authorization: Bearer <token>`
- **GET `/dashboard/summary`** — authenticated dashboard stats and recommendations
- **GET `/auth/google`** — start Google OAuth
- **GET `/auth/google/callback`** — redirects to `<FRONTEND_APP_URL>/auth/callback?token=<jwt>`

The frontend stores the token and routes by role.

## Catalog and ingestion

Scripts under `scripts/` support seeding, leaf-catalog assembly, registry-scale ingestion, URL verification, staging promotion, and exports (e.g. `npm run export:visible-csv`). Ingestion connectors and safety guards live in `src/modules/scholarship-ingestion/`.

Enable ingestion via environment variables (`INGESTION_ENABLED`, per-source flags, `INGEST_PIPELINE_MODE`). Docker first-run uses `scripts/docker-first-run.js` via the Compose `setup` profile.
