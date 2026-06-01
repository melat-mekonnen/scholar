# Milestone 5 — Checklist

Confirm embedding/index build before Milestone 6 (retrieval).

- [x] `src/indexing.py` exists with embedder loading, encoding, and FAISS `IndexFlatIP` build
- [x] `scripts/build_index.py` runs as `python -m scripts.build_index`
- [x] Outputs are written: `artifacts/index.faiss`, `artifacts/chunks_meta.json`, `artifacts/index.stats.json`
- [x] Optional smoke query (`--smoke-query`) prints nearest chunk matches with score and citation metadata

**Your manual steps:**

- [ ] Run export → merge → preprocess → chunk → build index on real data
- [ ] Verify index stats (`indexed_vectors`, `embedding_model`, `embedding_dimension`)
- [ ] Run a sample smoke query and check top hits are relevant before implementing retrieval API

When done, proceed to **Milestone 6**: `python -m scripts.retrieve_once` — see [MILESTONE_6_CHECKLIST.md](MILESTONE_6_CHECKLIST.md).
