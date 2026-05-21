# Scholar-ML — RAG Scholarship Chatbot

Standalone Python service for **grounded** scholarship Q&A: retrieve real listing snippets from a local index, then answer with a local LLM and citations.

**Status:** Milestones **0–8** implemented including FastAPI service (`run_server`, `/v1/chat`). Next: optional memory (M9) or EthioScholar integration (M10).  
**Not integrated** with EthioScholar (`scholar-f` / `scholar-backend`) until [Milestone 10](RAG_CHATBOT_PLAN.md).

Full roadmap: [RAG_CHATBOT_PLAN.md](RAG_CHATBOT_PLAN.md)

---

## Architecture

```text
                    ┌─────────────────────────────────────┐
                    │  EthioScholar (later, M10 only)      │
                    │  scholar-f → scholar-backend proxy     │
                    └──────────────────┬──────────────────┘
                                       │ HTTP (optional)
                                       ▼
┌──────────────┐   POST /v1/chat   ┌──────────────────────────────────┐
│    User      │ ────────────────► │  scholar-ml (FastAPI, M8+)         │
└──────────────┘                   │  retrieve → prompt → Ollama LLM    │
                                   └───────────────┬──────────────────┘
                                                   │
         ┌─────────────────────────────────────────┼─────────────────────────┐
         │                                         │                         │
         ▼                                         ▼                         ▼
  ┌─────────────┐                         ┌──────────────┐          ┌─────────────┐
  │  Ollama     │                         │  FAISS index │          │  chunks +   │
  │  Llama 3.x  │                         │  (offline)   │          │  metadata   │
  └─────────────┘                         └──────┬───────┘          └──────┬──────┘
                                                 │                         │
                                                 │ built from              │
                                                 ▼                         ▼
                                        ┌────────────────────────────────────────┐
                                        │  data/knowledge_base.jsonl + curated → merged.jsonl │
                                        │  (export from Postgres + curated)     │
                                        └────────────────────────────────────────┘
```

**Runtime path (one question):**

```text
User message
    → query embedding (Sentence Transformers)
    → FAISS top-K retrieval + optional filters (country, degree, …)
    → prompt with chunk text + URLs
    → Llama 3 via Ollama
    → answer + citations
```

---

## Data policy (allowed sources)

| Source | Allowed? | How |
|--------|----------|-----|
| **EthioScholar Postgres** — verified scholarships | Yes | Read-only export (`DATABASE_URL`), then merge with optional curated file (see Milestones 1–2) |
| **Curated file** you maintain | Yes | `curated/trusted_sources.jsonl` — see Milestone 2 (§4); merged into `data/knowledge_base.merged.jsonl` |
| Official program pages / RSS / CSV **you have rights to** | Yes, case-by-case | Add only via curated allowlist with provenance |
| Bulk scraping of third-party aggregators | **No** | Unless ToS and legal review explicitly allow it |

**Principles**

- **Read-only** toward production DB during export (dedicated read-only DB user recommended).
- No writes to production scholarships from this repo in early milestones.
- Every retrievable chunk must be traceable: `scholarship_id`, `source_url` or `canonical_url`, and export timestamp where applicable.

---

## User-facing disclaimer (use in UI when integrated)

> Answers are generated from retrieved scholarship listings in our knowledge base. **Deadlines, eligibility, and requirements can change.** Always confirm details on the **official application link** before you apply. EthioScholar does not guarantee completeness of third-party programs.

Store a short variant in the product; this service should **refuse to invent** deadlines when context is missing (prompt rules in Milestone 7).

---

## Frozen stack (Milestone 0)

| Component | Choice | Notes |
|-----------|--------|--------|
| **Embeddings** | `all-MiniLM-L6-v2` | 384-dim, fast CPU; see `src/config.py` |
| **Vector index** | FAISS (`IndexFlatIP` + normalized vectors) | Built offline in Milestone 5 |
| **LLM** | **Llama 3.2** (or `llama3`) via **Ollama** | Local; no API keys required for dev |
| **API** | FastAPI + Uvicorn | Port default `8020` |
| **Language** | Python 3.10+ | |

Changing the embedding model **requires a full re-index**. Changing the LLM requires re-checking answer quality and safety prompts.

---

## Project layout (target)

```text
scholar-ml/
├── README.md                 ← you are here
├── RAG_CHATBOT_PLAN.md
├── requirements.txt
├── .env.example
├── src/
│   ├── config.py               ← model + pipeline constants
│   ├── preprocess.py           ← M3 cleaning helpers
│   ├── chunking.py             ← M4 chunking
│   ├── indexing.py             ← M5 embeddings + FAISS
│   ├── retrieve.py             ← M6 retrieval + filters
│   ├── chat.py                 ← M7 prompt + Ollama client
│   ├── chat_service.py         ← M7/8 shared orchestration
│   └── api.py                  ← M8 FastAPI app
├── scripts/                    ← export/merge/preprocess/chunk/build-index/retrieve/chat/server (M1–M8)
├── data/                       ← generated JSONL (gitignored)
├── artifacts/                  ← FAISS index (gitignored)
└── curated/                    ← optional trusted_sources.jsonl
```

---

## Setup (development)

### 1. Python environment (Windows)

**Recommended — one script (no activation, fewer permission issues):**

```powershell
cd C:\Users\Kenean\Documents\scholar\scholar\scholar-ml
powershell -ExecutionPolicy Bypass -File .\scripts\setup_venv.ps1
```

To **wipe and recreate** `.venv` if it is corrupted or locked:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup_venv.ps1 -Recreate
```

**Manual setup** (if you prefer not to run scripts):

```powershell
cd scholar-ml
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

If `Activate.ps1` is blocked, use the full path to the venv Python (this is the most reliable on Windows):

```powershell
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -c "from src.config import EMBEDDING_MODEL; print(EMBEDDING_MODEL)"
```

---

#### `Permission denied` on `.venv\Scripts\python.exe` (Errno 13)

Common causes:

| Cause | What to do |
|--------|------------|
| **`pip install` still running** (or stuck in background) | Wait for it to finish, or end the process in Task Manager. |
| **`python -m venv .venv` run twice** while the first run is still creating files | Do not recreate the venv until the first command finishes. Use `setup_venv.ps1 -Recreate` once. |
| **Another app has the file open** (IDE, antivirus scan) | Close other terminals in `scholar-ml`, pause real-time scan for this folder, retry. |
| **Stale `.venv` after a failed install** | Run `setup_venv.ps1 -Recreate` or manually: `Remove-Item -Recurse -Force .venv` then `python -m venv .venv`. |
| **`Remove-Item` fails** | Reboot, then delete `.venv` again, then run `setup_venv.ps1`. |

**Do not** mix `scholar-ai\.venv` and `scholar-ml\.venv` — each project needs its **own** `.venv` inside its own folder.

**Optional:** If scripts are blocked by policy only for `.ps1`, you can still run:

```powershell
cd scholar-ml
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

### 2. Environment file

```powershell
copy .env.example .env
# Edit .env — DATABASE_URL required for Milestone 1 export
```

### 3. Milestone 1 — Export scholarships → `data/knowledge_base.jsonl`

Filters match `src/config.py` (`EXPORT_SCHOLARSHIP_STATUS`, deadline rules). Output is **gitignored**; re-run any time the DB changes.

```powershell
cd scholar-ml
.\.venv\Scripts\python.exe -m scripts.export_scholarships
```

Optional path:

```powershell
.\.venv\Scripts\python.exe -m scripts.export_scholarships --output data\knowledge_base.jsonl
```

Use a **read-only** Postgres role when pointing at production. For hosted DBs (e.g. Neon), `sslmode=require` is applied automatically unless the host is `localhost` / `127.0.0.1` or the URL sets `sslmode=disable`.

Checklist: [MILESTONE_1_CHECKLIST.md](MILESTONE_1_CHECKLIST.md).

### 4. Milestone 2 — Curated sources → merged JSONL

Maintain a small hand-edited file (start from [curated/trusted_sources.jsonl.example](curated/trusted_sources.jsonl.example)):

```powershell
copy curated\trusted_sources.jsonl.example curated\trusted_sources.jsonl
# Edit curated\trusted_sources.jsonl — one JSON object per line
```

Merge **after** exporting the DB slice (or use curated-only if the DB file is missing):

```powershell
.\.venv\Scripts\python.exe -m scripts.merge_knowledge_base
```

Defaults: reads `data/knowledge_base.jsonl` + `curated/trusted_sources.jsonl`, writes `data/knowledge_base.merged.jsonl`. If the curated file is absent, the merge step still runs and copies DB rows only (see stderr `INFO`). By default, curated lines whose `canonical_url` matches an existing `application_url` or `source_url` in the DB export are **skipped** (config: `MERGE_DEDUPE_CURATED_BY_URL_DEFAULT` in `src/config.py`); use `--no-dedupe` to keep them.

Curated rows are normalized to the same keys as DB export rows, plus `canonical_url` and `retrieved_at` for provenance, and `scholarship_id` values like `curated:<16-hex>` derived from the canonical URL.

Checklist: [MILESTONE_2_CHECKLIST.md](MILESTONE_2_CHECKLIST.md).

### 5. Milestone 3 — Preprocess merged JSONL → clean JSONL + stats

This step strips HTML, normalizes whitespace/URLs, fills empty descriptions, deduplicates records (URL-first), and validates required fields before chunking.

```powershell
.\.venv\Scripts\python.exe -m scripts.preprocess_knowledge_base
```

Defaults: reads `data/knowledge_base.merged.jsonl`, writes `data/knowledge_base.clean.jsonl` and `data/knowledge_base.clean.stats.json`. Use `--lowercase-text` only if you prefer normalized lowercase content.

Checklist: [MILESTONE_3_CHECKLIST.md](MILESTONE_3_CHECKLIST.md).

### 6. Milestone 4 — Chunk clean JSONL → `data/chunks.jsonl`

Creates overlap chunks and keeps retrieval metadata per chunk (`scholarship_id`, `url`, `deadline`, and filter fields).

```powershell
.\.venv\Scripts\python.exe -m scripts.chunk_knowledge_base
```

Defaults: reads `data/knowledge_base.clean.jsonl`, writes `data/chunks.jsonl` and `data/chunks.stats.json`.

Optional tuning:

```powershell
.\.venv\Scripts\python.exe -m scripts.chunk_knowledge_base --target-chars 700 --overlap-chars 120
```

Checklist: [MILESTONE_4_CHECKLIST.md](MILESTONE_4_CHECKLIST.md).

### 7. Milestone 5 — Embeddings + FAISS index build

Builds normalized sentence embeddings (`all-MiniLM-L6-v2`) and stores a FAISS `IndexFlatIP` plus chunk metadata map.

```powershell
.\.venv\Scripts\python.exe -m scripts.build_index
```

Optional smoke query:

```powershell
.\.venv\Scripts\python.exe -m scripts.build_index --smoke-query "scholarship for masters in AI"
```

Outputs:

- `artifacts/index.faiss`
- `artifacts/chunks_meta.json`
- `artifacts/index.stats.json`

Checklist: [MILESTONE_5_CHECKLIST.md](MILESTONE_5_CHECKLIST.md).

### 8. Milestone 6 — Retrieval + filters

Uses the saved FAISS index and `chunks_meta.json`. Applies **hard filters** on chunk metadata after vector search (same filter names as the planned M8 API: `country`, `degree_level`, `field` → `field_of_study` substring, `funding_type`).

```powershell
.\.venv\Scripts\python.exe -m scripts.retrieve_once "scholarship for masters in AI"
.\.venv\Scripts\python.exe -m scripts.retrieve_once "funding" --country ET --degree-level masters --field "computer"
.\.venv\Scripts\python.exe -m scripts.retrieve_once "query" --json
```

Requires a prior `python -m scripts.build_index`. When filters are set, the CLI searches extra neighbors (`RETRIEVAL_FILTER_OVERSAMPLE` in `src/config.py`); use `--oversample N` if results are sparse.

Checklist: [MILESTONE_6_CHECKLIST.md](MILESTONE_6_CHECKLIST.md).

### 9. Milestone 7 — Prompt + local Ollama (`chat_once`)

This one-shot CLI does: retrieval context -> grounded prompt -> Ollama response -> citations.

```powershell
.\.venv\Scripts\python.exe -m scripts.chat_once "masters scholarship in AI"
.\.venv\Scripts\python.exe -m scripts.chat_once "scholarship" --country ET --degree-level masters
```

Dry-run (tests retrieval+prompt without calling Ollama):

```powershell
.\.venv\Scripts\python.exe -m scripts.chat_once "masters scholarship in AI" --dry-run
```

JSON output:

```powershell
.\.venv\Scripts\python.exe -m scripts.chat_once "query" --json
```

Checklist: [MILESTONE_7_CHECKLIST.md](MILESTONE_7_CHECKLIST.md).

### 10. Milestone 8 — FastAPI service

Start the HTTP API (default `http://127.0.0.1:8020`):

```powershell
.\.venv\Scripts\python.exe -m scripts.run_server
```

Endpoints:

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Index readiness + vector count |
| GET | `/v1/version` | Service + model version info |
| POST | `/v1/chat` | RAG answer + citations |

Example request:

```powershell
curl -X POST http://127.0.0.1:8020/v1/chat -H "Content-Type: application/json" -d "{\"message\":\"masters scholarship in AI\",\"filters\":{\"country\":\"ET\"},\"dry_run\":true}"
```

Request body fields: `message` (required), optional `conversation_id` (reserved), optional `filters` (`country`, `degree_level`, `funding_type`, `field`), optional `dry_run` (skip Ollama for testing).

Checklist: [MILESTONE_8_CHECKLIST.md](MILESTONE_8_CHECKLIST.md).

### 11. Ollama runtime (needed from Milestone 7 onward)

Install [Ollama](https://ollama.com), then:

```powershell
ollama pull llama3.2
ollama serve
```

Verify: `curl http://127.0.0.1:11434/api/tags`

---

## Milestones

| # | Name | Status |
|---|------|--------|
| 0 | Scope & safety (this doc + config) | **Done** |
| 1 | Export scholarships from DB → `knowledge_base.jsonl` | **Done** (script) |
| 2 | Curated trusted sources + merged build | **Done** (script + example file) |
| 3 | Preprocess / clean | **Done** (script + stats output) |
| 4 | Chunking | **Done** (script + chunk stats) |
| 5 | Embeddings + FAISS | **Done** (index + metadata + stats scripts) |
| 6 | Retrieval + filters | **Done** (`retrieve_once` + `src/retrieve.py`) |
| 7 | Prompt + local LLM | **Done** (`chat_once` + `src/chat.py`) |
| 8 | FastAPI `/v1/chat` | **Done** (`run_server`, `/health`, `/v1/version`) |
| 9 | Chat memory (optional) | Next (optional) |
| 10 | Wire to EthioScholar | Pending |

---

## Isolation from the main app

| Repo / service | Role | Touched by scholar-ml? |
|----------------|------|----------------------|
| `scholar-f` | Web UI | No (until M10) |
| `scholar-backend` | API, auth, billing | No (until M10) |
| `scholar-ai` | AI **matching** / recommendations | No — separate from RAG chat |
| **scholar-ml** | RAG **chatbot** | All work here |

---

## License & data

Use only data you are allowed to store and embed. When in doubt, add sources to the curated allowlist with documentation, not silent scraping.
