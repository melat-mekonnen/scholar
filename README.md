# EthioScholar

**EthioScholar** is a scholarship discovery and application platform. Students browse verified opportunities with clear eligibility and deadlines, get AI-powered recommendations, save listings, track applications, and use document templates—all in one place. Operators and admins manage the catalog, users, and platform health through dedicated dashboards.

## What you can do

| Audience | Capabilities |
|----------|----------------|
| **Students** | Search and filter scholarships, AI match suggestions, bookmarks, application tracking, community, document workspace, notifications |
| **Managers / owners** | Curate scholarships, approvals, posting profiles, trusted imports |
| **Admins** | User management, audit logs, catalog operations, notifications |

Public listings emphasize **verified** records with transparent application URLs and key dates so applicants can compare options without chasing scattered sources.

## Repository layout

| Directory | Role |
|-----------|------|
| [`scholar-f/`](scholar-f/) | Next.js web app (marketing site + student portal + admin/owner/manager UIs) |
| [`scholar-backend/`](scholar-backend/) | Express API, Postgres (Neon or local), auth, scholarships catalog, ingestion pipelines |
| [`scholar-ai/`](scholar-ai/) | Optional Python service for TF‑IDF scholarship recommendations |
| [`scholar-ml/`](scholar-ml/) | Optional RAG chatbot service (local LLM + FAISS; not required for core app) |

Supporting files at the repo root include Docker Compose definitions (`.env.docker.example`, `docker-compose.yml`, `docker-up.sh`).

## Quick start (Docker)

From the repository root:

```bash
cp .env.docker.example .env
# Edit .env: JWT_SECRET, optional Google OAuth, etc.

./docker-up.sh
```

This starts Postgres, runs schema + initial ingest (`setup` profile), then the API and web UI.

- **Web:** http://localhost:3000 (override with `WEB_PORT`)
- **API health:** http://localhost:4000/health (override with `API_PORT`)

Re-run ingest only:

```bash
docker compose --profile setup run --rm setup
```

## Local development (without Docker)

### 1. Database and API

```bash
cd scholar-backend
npm install
cp .env.example .env   # set DATABASE_URL, JWT_SECRET, FRONTEND_APP_URL, Google OAuth if needed
# Apply schema from db/schema.sql (or npm run db:reset for a clean local DB — dev only)
npm run dev
```

API default: **http://localhost:4000**

See [`scholar-backend/README.md`](scholar-backend/README.md) for auth endpoints, test-role seeding (`npm run seed:test-roles`), and catalog/ingestion scripts.

### 2. Frontend

```bash
cd scholar-f
pnpm install   # or npm install
pnpm dev
```

App default: **http://localhost:3000**

If the API is not on the same origin, set `NEXT_PUBLIC_API_BASE_URL` (e.g. `http://localhost:4000`).

Pre-launch: run `npm run verify:launch` from `scholar-backend`.

### 3. AI recommendations (optional)

```bash
cd scholar-ai
python -m venv .venv
source .venv/bin/activate   # Windows: .\.venv\Scripts\activate
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8010
```

In `scholar-backend/.env`, set `AI_SERVICE_URL=http://127.0.0.1:8010`. Details: [`scholar-ai/README.md`](scholar-ai/README.md).

### 4. RAG chatbot (optional, separate)

The `scholar-ml` service provides grounded Q&A over an offline index. It is **not** required to run the main student experience. See [`scholar-ml/README.md`](scholar-ml/README.md).

## Scholarship catalog

The backend maintains a curated scholarship catalog: official programme leaf data, registry-driven ingestion, staging/review workflows, and safety checks before listings appear in public browse. Operational scripts live under `scholar-backend/scripts/` (e.g. `export:visible-csv`, catalog ingestion runners). Ingestion is gated by environment flags in Docker and production.

## Tech stack

- **Frontend:** Next.js, React, Tailwind, Radix UI
- **Backend:** Node.js, Express, PostgreSQL
- **Auth:** Email/password + Google OAuth, JWT
- **AI:** Python (FastAPI) for recommendations; optional Ollama/RAG stack in `scholar-ml`

## License and contributions

This repository is a private monorepo for the EthioScholar product. For environment-specific secrets, use `.env` files locally and never commit credentials.
