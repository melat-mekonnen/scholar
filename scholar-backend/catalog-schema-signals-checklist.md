# Catalog Schema Signals Checklist

This checklist tracks additive schema work for deadline and eligibility intelligence, plus dynamic source onboarding tables.

## Migration command

- `npm run migrate:catalog-sourcing-signals`

## What this migration adds

- Scholarship signal columns (all additive and nullable-safe):
  - `deadline_raw_text`
  - `deadline_source`
  - `deadline_confidence`
  - `deadline_last_checked_at`
  - `is_rolling_evidence`
  - `eligibility_raw_text`
  - `eligible_for_ethiopians`
  - `eligibility_confidence`
  - `ethiopian_relevance_score`
- Confidence/range checks for:
  - `deadline_confidence` (0..100)
  - `eligibility_confidence` (0..100)
  - `ethiopian_relevance_score` (0..100)
- Source onboarding tables:
  - `ingestion_sources`
  - `ingestion_source_candidates`

## Safety expectations

- No destructive cleanup in migration.
- Existing verified scholarship status remains unchanged.
- Verified floor guard remains active in ingestion runtime.

## Post-migration verification

- Re-run baseline check:
  - `npm run baseline:catalog-safety -- --label=post_schema_signals`
- Confirm verified counts did not decrease.
