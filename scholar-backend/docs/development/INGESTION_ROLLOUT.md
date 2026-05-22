# Ingestion rollout plan (internal)

This document tracks delivery order. **Script and module names describe behavior**, not plan phase numbers.

| Step | Goal | Scripts |
|------|------|---------|
| 1 | Verified leaf catalog (≥155) | `scholarships/bootstrap-verified-catalog.js` |
| 2 | Sectioned EN descriptions + facts | `scholarships/enrich-descriptions.js`, `verify-enriched-content.js` |
| 3 | UI i18n shell (`?lang=am`) | Frontend only — no ingest script |
| 4 | Catalog depth (≥300 leaves) | `scholarships/expand-catalog.js` |
| 5 | Study programmes + links | `programmes/bootstrap-programmes.js` |
| 6 | OpenRouter refine + Amharic DB fields | `ai/translate-with-openrouter.js` |

**Production bootstrap (steps 1–5, no API key):**

```bash
npm run setup:bootstrap
# Docker:
docker compose --profile setup run --rm setup
```

**Optional OpenRouter (step 6):**

```bash
# OPENROUTER_API_KEY + AI_DESCRIPTION_REFINE_ENABLED=true
npm run ai:translate-openrouter
```
