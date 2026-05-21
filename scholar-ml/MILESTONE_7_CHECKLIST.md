# Milestone 7 — Checklist

Confirm prompt + local LLM behavior before Milestone 8 (FastAPI orchestration).

- [x] `src/chat.py` exists with grounded prompt construction and Ollama chat client
- [x] `scripts/chat_once.py` runs as `python -m scripts.chat_once "<message>"`
- [x] `chat_once` reuses retrieval context and prints citation-friendly output
- [x] `--dry-run` mode works without Ollama and validates prompt/context flow

**Your manual steps:**

- [ ] Ensure `ollama serve` is running and model is available (`ollama pull llama3.2`)
- [ ] Run `chat_once` on real index with and without filters; inspect groundedness + citations
- [ ] Confirm behavior when retrieval is empty (should not invent details)

When done, proceed to **Milestone 8**: `python -m scripts.run_server` — see [MILESTONE_8_CHECKLIST.md](MILESTONE_8_CHECKLIST.md).
