# Milestone 4 — Checklist

Confirm chunking before Milestone 5 (embeddings + FAISS).

- [x] `src/chunking.py` exists with overlap chunking and retrieval metadata mapping
- [x] `scripts/chunk_knowledge_base.py` runs as `python -m scripts.chunk_knowledge_base`
- [x] Outputs are written: `data/chunks.jsonl` + `data/chunks.stats.json`
- [x] Each chunk has `chunk_id`, `scholarship_id`, `chunk_index`, `chunk_text`, `url`, and filter metadata (`country`, `degree_level`, `field_of_study`, `funding_type`, `deadline`)

**Your manual steps:**

- [ ] Run export → merge → preprocess → chunk and inspect several chunk lines
- [ ] Confirm `target_chars`/`overlap_chars` are suitable for your data (defaults from `src/config.py`)
- [ ] Check stats (`avg_chunks_per_row`, `rows_without_chunk_text`) before building embeddings

When done, proceed to **Milestone 5**: `python -m scripts.build_index` — see [MILESTONE_5_CHECKLIST.md](MILESTONE_5_CHECKLIST.md).
