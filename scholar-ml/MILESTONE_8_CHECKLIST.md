# Milestone 8 — Checklist

Confirm FastAPI service before Milestone 9 (optional chat memory).

- [x] `src/api.py` exposes `GET /health`, `GET /v1/version`, `POST /v1/chat`
- [x] `src/chat_service.py` shared orchestration used by CLI + API
- [x] `scripts/run_server.py` starts Uvicorn on `SCHOLAR_ML_HOST` / `SCHOLAR_ML_PORT` (default `8020`)
- [x] Request validation (`message` length) and body size limit middleware
- [x] Response includes `answer` + `citations` (`scholarship_id`, `title`, `url`)

**Your manual steps:**

- [ ] Build index on real data, then start server: `python -m scripts.run_server`
- [ ] `curl http://127.0.0.1:8020/health` and `curl http://127.0.0.1:8020/v1/version`
- [ ] POST `/v1/chat` with JSON body; verify citations when Ollama is running
- [ ] Use `"dry_run": true` in body for prompt/retrieval testing without Ollama

When done, proceed to **Milestone 9** (optional conversation memory) or **Milestone 10** (EthioScholar integration).
