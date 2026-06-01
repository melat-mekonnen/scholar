# Scholar-ML: RAG Scholarship Chatbot — Implementation Plan

Independent service under `scholar/scholar-ml/`. **Does not modify** `scholar-f`, `scholar-backend`, or `scholar-ai` until the optional integration milestone. Later, the main system can call this service over HTTP from the chatbot page.

---

## Principles

| Principle | Detail |
|-----------|--------|
| **Isolation** | Own `venv`, `requirements.txt`, `README`, `.env.example`. |
| **Read-only DB** | Export/sync scripts use read-only Postgres user or one-off exports. No writes to production scholarships in early milestones. |
| **Data** | Real rows from your database + small **allowlisted** trusted sources (official URLs, curated snippets, RSS you have rights to). |
| **Integration last** | Wire `SCHOLAR_ML_CHAT_URL` (or similar) only after the service is stable. |

---

## Pipeline Overview

```text
User Message
    ↓
Query Embedding (Sentence Transformers)
    ↓
FAISS Retrieval
    ↓
Filtering + (optional) Cross-Encoder Reranking
    ↓
Prompt Construction (RAG context)
    ↓
LLM Generation (e.g. Llama 3 via Ollama / vLLM)
    ↓
Chatbot Response (+ citations)
```

**Core stack:** Python · sentence-transformers · FAISS · FastAPI · local LLM (Llama 3 family) · optional cross-encoder reranker.

---

## Milestone 0 — Scope & Safety

**Goals**

- Define allowed data sources: verified DB rows + explicit allowlist (official program pages, licensed RSS, owned CSV).
- Document user-facing disclaimer: answers are grounded on retrieved snippets; users must verify deadlines on official links.
- Pick **one** embedding model (e.g. `all-MiniLM-L6-v2`) and **one** LLM runtime (e.g. Ollama + Llama 3) for the whole project.

**Exit criteria**

- `scholar-ml/README.md` includes data policy, disclaimer, and a simple architecture diagram.

---

## Milestone 1 — Knowledge Base from Your Database

**Goals**

- Python export script under `scholar-ml/scripts/` (e.g. `export_scholarships.py`).
- Connect with `DATABASE_URL` (read-only user recommended).
- Export fields needed for RAG: `title`, `description`, `country`, `degree_level`, `field_of_study`, `funding_type`, `deadline`, `application_url`, `status`, `source_url`, internal `id`, etc.
- Filter to verified / active rows consistent with your production rules (e.g. `status = verified`, non-expired if applicable).

**Output**

- `data/knowledge_base.jsonl` — one JSON object per line, stable schema.

**Exit criteria**

- Reproducible command (e.g. `python -m scripts.export_scholarships`) produces real rows from staging or production read replica.

---

## Milestone 2 — Trusted Supplementary Sources

**Goals**

- Merge a **small** curated JSON/CSV: official summaries you control, with `source_type`, `canonical_url`, `retrieved_at`.
- Avoid bulk scraping of third-party aggregators without ToS and rights review.

**Exit criteria**

- `knowledge_base.jsonl` (or merged build) includes DB slice + curated rows with provenance fields.

**Implementation (scholar-ml)**

- DB export: `data/knowledge_base.jsonl` via `python -m scripts.export_scholarships`.
- Curated file: `curated/trusted_sources.jsonl` (copy from `curated/trusted_sources.jsonl.example`).
- Merged build: `data/knowledge_base.merged.jsonl` via `python -m scripts.merge_knowledge_base` (optional URL dedupe vs DB rows; see `MERGE_DEDUPE_CURATED_BY_URL_DEFAULT` in `src/config.py`).

---

## Milestone 3 — Text Preprocessing

**Goals**

- Module e.g. `src/preprocess.py`: strip HTML, normalize whitespace, lowercase where appropriate, dedupe by `application_url` / `source_url`, sensible defaults for missing `description`.

**Output**

- `data/knowledge_base.clean.jsonl` plus a short stats report (row counts, duplicates dropped).

**Exit criteria**

- Clean file passes schema validation; no silent data loss without logging.

**Implementation (scholar-ml)**

- Cleaning helpers: `src/preprocess.py` (HTML stripping, whitespace/URL normalization, dedupe key).
- Runner: `python -m scripts.preprocess_knowledge_base`.
- Outputs: `data/knowledge_base.clean.jsonl` and `data/knowledge_base.clean.stats.json`.

---

## Milestone 4 — Chunking & Metadata

**Goals**

- Split long descriptions into chunks (e.g. 400–800 tokens with overlap).
- Each chunk carries `scholarship_id`, `chunk_id`, `url`, `deadline`, and other filter fields for retrieval.

**Output**

- `data/chunks.jsonl`

**Exit criteria**

- Chunks load in a smoke test; metadata sufficient for filtering and citations.

**Implementation (scholar-ml)**

- Chunk helpers: `src/chunking.py`.
- Runner: `python -m scripts.chunk_knowledge_base`.
- Outputs: `data/chunks.jsonl` and `data/chunks.stats.json`.

---

## Milestone 5 — Embeddings & FAISS Index (Offline)

**Goals**

- Script: load chunks → sentence-transformers encode → FAISS (`IndexFlatIP` or HNSW — document choice).
- Persist `artifacts/index.faiss` and `artifacts/chunks_meta.json` (or equivalent id → text, url, deadline map).

**Exit criteria**

- `python -m scripts.build_index` completes end-to-end; manual nearest-neighbor checks for sample queries look reasonable.

**Implementation (scholar-ml)**

- Index helpers: `src/indexing.py`.
- Runner: `python -m scripts.build_index`.
- Outputs: `artifacts/index.faiss`, `artifacts/chunks_meta.json`, `artifacts/index.stats.json`.

---

## Milestone 6 — Retrieval + Rule-Based Filters

**Goals**

- Implement `retrieve(query, filters)`: embed query → top-K FAISS; apply hard filters (country, degree level, funding) when the client sends them.
- Optional: cross-encoder rerank top-20 → top-5 (can defer to v1.1).

**Exit criteria**

- CLI or script prints retrieved chunks and scores; human review of relevance.

**Implementation (scholar-ml)**

- Retrieval + filters: `src/retrieve.py` (`retrieve`, `RetrievalFilters`, `passes_filters`).
- CLI: `python -m scripts.retrieve_once "<query>"` with optional `--country`, `--degree-level`, `--funding-type`, `--field`.

---

## Milestone 7 — Prompt Construction + Local LLM

**Goals**

- Prompt template: system (scholarship expert, cite titles, do not invent deadlines), context (top chunks with URLs), user message.
- Call Llama 3 (or chosen model) via Ollama or vLLM.
- Behavior: if context is insufficient, respond that information is missing and point to official links / browse flow.

**Exit criteria**

- `python -m scripts.chat_once "..."` returns a grounded answer with traceable chunk IDs or titles.

**Implementation (scholar-ml)**

- Prompt + Ollama client: `src/chat.py`.
- CLI: `python -m scripts.chat_once "<message>"` (supports retrieval filters and dry-run mode).

---

## Milestone 8 — FastAPI Orchestration

**Goals**

- `POST /v1/chat` — body: `message`, optional `conversation_id`, optional `filters`.
- Response: `answer`, `citations` (titles, urls, scholarship ids).
- `GET /health`, `GET /v1/version`; timeouts and request size limits.

**Optional**

- `Dockerfile` for deployment.

**Exit criteria**

- Service runs on `localhost:PORT`; testable with curl/Postman without touching Scholar frontend or backend.

**Implementation (scholar-ml)**

- Shared orchestration: `src/chat_service.py`.
- FastAPI app: `src/api.py` (`/health`, `/v1/version`, `/v1/chat`).
- Server runner: `python -m scripts.run_server` (default port `8020`).

---

## Milestone 9 — Chat Memory (Optional v1.1)

**Goals**

- Last N turns keyed by `conversation_id` (in-process dict, SQLite, or Redis **inside scholar-ml only**).
- Retrieval still uses current query + optional filters derived from recent turns.

**Exit criteria**

- Multi-turn demo works through the same API.

---

## Milestone 10 — Integration with Main Scholar Stack (When Ready)

**Goals**

- Backend: if `SCHOLAR_ML_CHAT_URL` is set, proxy chat to scholar-ml; otherwise keep current behavior.
- Frontend: optional feature flag or separate route — minimal change.

**Exit criteria**

- Production can run unchanged until the flag or env is enabled.

---

## Dependency Order

```text
M0 → M1 → M2 → M3 → M4 → M5 → M6 → M7 → M8 → M9 (optional) → M10 (optional)
```

---

## Real Data + Trusted Sources Checklist

| Requirement | Approach |
|-------------|----------|
| Real DB data | Read-only export → `jsonl` |
| Trusted extras | Small curated file + official URLs |
| No impact on existing apps | All work under `scholar-ml/` until M10 |
| Auditability | Every chunk includes `scholarship_id`, `source_url`, `retrieved_at` where applicable |

---

## Suggested API Contract (for M8 / future M10)

**Request** (`POST /v1/chat`)

```json
{
  "message": "string",
  "conversation_id": "string | null",
  "filters": {
    "country": "string | null",
    "degree_level": "string | null",
    "field": "string | null"
  }
}
```

**Response**

```json
{
  "answer": "string",
  "citations": [
    { "scholarship_id": "string", "title": "string", "url": "string" }
  ]
}
```

Adjust field names to match your DB and frontend when integrating.

---

*Document version: 1.0 — aligns with the RAG development pipeline (data → clean → embed → FAISS → retrieve → prompt → LLM → orchestration).*
