# Catalog Safety Checklist

This checklist establishes a non-destructive baseline before schema and scoring changes.

**Read first:** [`catalog-ingestion-rules.md`](./catalog-ingestion-rules.md) — authoritative rules for what may be published, correct scaling workflow, and scripts that are allowed vs forbidden.

## Baseline commands

- Create catalog baseline snapshot:
  - `npm run baseline:catalog-safety`
- Optional custom label/table:
  - `node scripts/establish-catalog-safety-baseline.js --label=catalog_safety_start --snapshot=scholarships_verified_snapshot_baseline`

## Verified floor guard

- Runtime ingestion guard reads floor from:
  1. `VERIFIED_SCHOLARSHIP_FLOOR` (env, optional)
  2. highest `verified_count` from `scholarship_catalog_baselines`
- Effective floor is `max(envFloor, baselineFloor)`.
- Ingestion aborts when:
  - post-run verified scholarship count `< floor`
  - post-run verified scholarship count `< pre-run count` for the source run

## Non-destructive guarantees

- Baseline snapshot table is created once and never modified by ingestion.
- Existing verified scholarships are not downgraded by this baseline work.
- Public catalog remains verified-only and hides expired rows.

## Grouped ingestion scripts policy

- Prefer grouped scripts with parameters (for example `--source=...`) over one script per source.
- Preferred grouped commands:
  - `npm run catalog:ingest -- --source=africa`
  - `npm run catalog:ingest:phase1`
  - `npm run catalog:ingest:pipeline`
- Legacy per-source scripts remain as deprecated wrappers for compatibility.
