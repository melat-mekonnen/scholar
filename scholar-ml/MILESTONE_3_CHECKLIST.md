# Milestone 3 — Checklist

Confirm preprocessing before Milestone 4 (chunking).

- [x] `src/preprocess.py` exists with HTML stripping, whitespace normalization, URL normalization, and dedupe-key logic
- [x] `scripts/preprocess_knowledge_base.py` runs as `python -m scripts.preprocess_knowledge_base`
- [x] Output files are written: `data/knowledge_base.clean.jsonl` + `data/knowledge_base.clean.stats.json`
- [x] Stats include counts (`input`, `output`, `dropped_duplicates`, `dropped_invalid`) and sampled validation errors

**Your manual steps:**

- [ ] Run export + merge + preprocess in sequence and inspect a sample of cleaned rows
- [ ] Check stats JSON for unexpected drops before building chunks
- [ ] Decide whether to enable `--lowercase-text` for your dataset (default keeps original casing)

When done, proceed to **Milestone 4**: `python -m scripts.chunk_knowledge_base` — see [MILESTONE_4_CHECKLIST.md](MILESTONE_4_CHECKLIST.md).
