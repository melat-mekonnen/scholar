# Milestone 0 — Checklist

Use this to confirm M0 is complete before starting M1.

- [x] Allowed data sources documented (DB verified rows + curated allowlist)
- [x] User-facing disclaimer drafted in README
- [x] Embedding model chosen: `all-MiniLM-L6-v2` (`src/config.py`)
- [x] LLM runtime chosen: Ollama + `llama3.2` (`src/config.py`, `.env.example`)
- [x] Architecture diagram in README
- [x] `requirements.txt`, `.env.example`, `.gitignore`
- [x] Isolation from scholar-f / scholar-backend / scholar-ai stated

**Your manual steps (one-time):**

- [ ] Create `.venv` and `pip install -r requirements.txt`
- [ ] Copy `.env.example` → `.env`
- [ ] (Optional now) Install Ollama and `ollama pull llama3.2` — required by M7, not M0

When the manual steps are done, proceed to **Milestone 1**: run `python -m scripts.export_scholarships` and see [MILESTONE_1_CHECKLIST.md](MILESTONE_1_CHECKLIST.md).
