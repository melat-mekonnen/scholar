# Backend scripts

Operational scripts grouped by responsibility. Run from `scholar-backend/` (or via `npm run`).

## Setup

| Script | npm | Purpose |
|--------|-----|---------|
| `setup/bootstrap-data.js` | `setup:bootstrap` | Full local/Docker data bootstrap (catalog → content → programmes) |
| `setup/docker-first-run.js` | — | Docker one-shot entry (schema + bootstrap) |

## Database

| Script | npm | Purpose |
|--------|-----|---------|
| `db/ensure-schema.js` | `db:ensure` | Idempotent schema + content migrations |
| `db/migrations/migrate-content-schema.js` | `migrate:content-schema` | Scholarships/programmes content columns |

## Scholarships (catalog & content)

| Script | npm | Purpose |
|--------|-----|---------|
| `scholarships/sync-leaf-catalog.js` | `scholarships:sync-catalog` | Upsert configured leaf catalog as verified |
| `scholarships/bootstrap-verified-catalog.js` | `scholarships:bootstrap-verified` | Migrate + sync + quality gates for curated leaves |
| `scholarships/expand-catalog.js` | `scholarships:expand-catalog` | Sync expanded catalog + crawl UK funding hubs |
| `scholarships/enrich-descriptions.js` | `scholarships:enrich-descriptions` | Fetch pages, extract facts, write sectioned descriptions |
| `scholarships/verify-enriched-content.js` | `scholarships:verify-content` | Gate: ≥90% verified rows have sectioned descriptions |
| `scholarships/crawl-uk-funding-pages.js` | `scholarships:crawl-uk-funding` | Discover bursary links from university hubs |
| `scholarships/ingest-curated.js` | `ingest:curated-leaf` | Staging pipeline ingest for curated leaf pack |

## Study programmes

| Script | npm | Purpose |
|--------|-----|---------|
| `programmes/seed-study-programmes.js` | `programmes:seed` | Seed Warwick fee-paying programmes |
| `programmes/crawl-warwick-programmes.js` | `programmes:crawl-warwick` | Discover Warwick UG/PG course URLs |
| `programmes/link-to-scholarships.js` | `programmes:link-scholarships` | Populate `programme_scholarships` |
| `programmes/bootstrap-programmes.js` | `programmes:bootstrap` | Seed + crawl + link + verify |

## AI (optional — requires OpenRouter)

| Script | npm | Purpose |
|--------|-----|---------|
| `ai/translate-with-openrouter.js` | `ai:translate-openrouter` | LLM description refine + Amharic translation |

Internal rollout notes (not code names): see `docs/development/INGESTION_ROLLOUT.md`.
