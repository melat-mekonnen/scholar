# Milestone 1 — Checklist

Confirm the export pipeline before Milestone 2 (curated merge).

- [x] `scripts/export_scholarships.py` exists; runnable as `python -m scripts.export_scholarships` from `scholar-ml` root
- [x] Filters use `src/config.py` (`EXPORT_SCHOLARSHIP_STATUS`, `EXPORT_INCLUDE_NULL_DEADLINE`)
- [x] Output path default `data/knowledge_base.jsonl` (directory created if missing)
- [x] Each JSONL line includes `scholarship_id`, `source_url`, `exported_at`, and fields needed for later chunking

**Your manual steps:**

- [ ] `.env` contains a valid `DATABASE_URL` (read-only user recommended for production)
- [ ] Run export; open `data/knowledge_base.jsonl` and spot-check a few lines against the app
- [ ] (Optional) Save a dated copy elsewhere if you want a snapshot outside `data/` (still gitignored)

When done, proceed to **Milestone 2**: copy [curated/trusted_sources.jsonl.example](curated/trusted_sources.jsonl.example) if needed, then `python -m scripts.merge_knowledge_base` — see [MILESTONE_2_CHECKLIST.md](MILESTONE_2_CHECKLIST.md).
