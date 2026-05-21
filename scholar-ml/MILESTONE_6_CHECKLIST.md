# Milestone 6 — Checklist

Confirm retrieval before Milestone 7 (prompt + LLM).

- [x] `src/retrieve.py` implements `retrieve()` + `RetrievalFilters` + hard filters on metadata
- [x] `scripts/retrieve_once.py` runs as `python -m scripts.retrieve_once "<query>"`
- [x] Filters: `--country`, `--degree-level`, `--funding-type`, `--field` (substring on `field_of_study`)
- [x] Uses `RETRIEVAL_FILTER_OVERSAMPLE` from `src/config.py` when filters are active

**Your manual steps:**

- [ ] Build index (`python -m scripts.build_index`) on real `data/chunks.jsonl`
- [ ] Run `retrieve_once` with and without filters; confirm results look sensible
- [ ] If many chunks are filtered out, consider raising `--oversample` or rebuilding with more chunk diversity

When done, proceed to **Milestone 7**: `python -m scripts.chat_once` — see [MILESTONE_7_CHECKLIST.md](MILESTONE_7_CHECKLIST.md).
