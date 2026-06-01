# Milestone 2 — Checklist

Confirm curated merge before Milestone 3 (preprocess).

- [x] `scripts/merge_knowledge_base.py` exists; runnable as `python -m scripts.merge_knowledge_base`
- [x] Defaults wired in `src/config.py` (`CURATED_TRUSTED_SOURCES_RELPATH`, `MERGED_KNOWLEDGE_BASE_RELPATH`, dedupe flag)
- [x] Merged rows carry provenance: DB rows keep `exported_at`; curated rows keep `canonical_url`, `retrieved_at`, synthetic `scholarship_id`
- [x] Example schema in `curated/trusted_sources.jsonl.example`

**Your manual steps:**

- [ ] Copy the example to `curated/trusted_sources.jsonl` and replace with real, rights-checked entries (or leave absent for DB-only merges)
- [ ] Run `export_scholarships` then `merge_knowledge_base`; inspect `data/knowledge_base.merged.jsonl`
- [ ] Confirm dedupe behavior: if a curated `canonical_url` matches a DB `application_url` / `source_url`, the curated line is skipped unless you pass `--no-dedupe`

When done, proceed to **Milestone 3**: `python -m scripts.preprocess_knowledge_base` — see [MILESTONE_3_CHECKLIST.md](MILESTONE_3_CHECKLIST.md).
