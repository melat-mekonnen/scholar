# Scholar AI Service (TF‑IDF Recommendations)

This is a small Python service that scores scholarships against a student profile using TF‑IDF + cosine similarity.

## Run locally

```powershell
cd scholar-ai
python -m venv .venv
.\.venv\Scripts\activate
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8010
```

Use `python -m pip` and `python -m uvicorn` on Windows so you never hit broken `pip.exe` / `uvicorn.exe` stubs.

**If you see** `Fatal error in launcher: Unable to create process using '"D:\some\old\path\.venv\Scripts\python.exe"'`, the `.venv` was created on another drive or folder. Delete it and recreate: `Remove-Item -Recurse -Force .venv` then `python -m venv .venv` again.

This matches the backend default `AI_SERVICE_URL` (`http://127.0.0.1:8010`). If you use another port, set `AI_SERVICE_URL` in `scholar-backend` `.env` to the same URL.

Open docs at `http://127.0.0.1:8010/docs`.

### Chat retrieval tuning (optional)

- **`SCHOLAR_CHAT_SBERT`**: set to `1` / `true` / `yes` to use sentence-transformers for `/ai/chat/query` retrieval (slower on CPU; can hit HTTP timeouts if the corpus is large).
- **`SCHOLAR_CHAT_MAX_RECORDS`**: max rows merged into the chat index (default **500**, clamped 50–2000).

Default behavior uses **TF‑IDF** for chat (fast, similar spirit to `/ai/recommend`).

## API

### `POST /ai/recommend`

Request body example:

```json
{
  "student": {
    "id": "user_123",
    "text": "master computer science germany ai data science"
  },
  "scholarships": [
    {
      "id": "sch_1",
      "title": "DAAD Scholarship",
      "description": "Funding for Master students in Germany ..."
    }
  ],
  "topN": 10
}
```

Response:

```json
{
  "results": [
    {
      "id": "sch_1",
      "score": 0.0231,
      "matchPercent": 100.0,
      "matchedTerms": ["germany", "master", "daad"]
    }
  ]
}
```

- **`score`**: raw similarity (0–1) from TF‑IDF / fallbacks.
- **`matchPercent`**: **100 × (score / best score in this request)** — the top match is **100%**; others scale down (e.g. half the similarity ≈ **50%**). You only see **0%** when similarity is ~0, not because another card “took” 100%.

### `POST /ai/chat/query`

Hybrid RAG chatbot endpoint for:

- `find_scholarship`
- `eligibility_check`
- `deadline_check`

Request example:

```json
{
  "message": "Find fully funded AI masters in Germany with near deadlines",
  "topK": 5,
  "profile": {
    "fieldOfStudy": "Computer Science",
    "degreeLevel": "master",
    "gpa": 3.6,
    "interests": ["ai", "data science"],
    "preferredCountry": "Germany"
  },
  "scholarships": [],
  "includePublicDataset": true
}
```

Response shape:

```json
{
  "intent": "find_scholarship",
  "recommendations": [],
  "eligibility": "",
  "deadlines": []
}
```

### Trusted RSS / Atom ingestion

- **`POST /ai/feeds/fetch`** — body `{ "feed_urls": ["https://…"] }` (max 20). Returns normalized `{ items: [{ title, description, sourceUrl, sourceName, published }] }` for the backend to store as **pending** scholarships. No web scraping of arbitrary pages; only **feeds you configure**.
- **`POST /ai/discover`** — can include provider **`rss`** plus **`rss_feed_urls`** to rank feed entries against a student profile (same scoring as recommend).

Only add feed URLs you are **allowed** to use (terms of service, robots.txt where applicable). This does not crawl full websites.

## Notes

- Token overlap uses **Unicode** word characters (not ASCII-only), so non‑Latin profiles still score. If token overlap is still empty, the service falls back to **character bigrams** so narrow profiles (e.g. `cs`, `bachelor`) are not stuck at 0% on every card.
- This is **not neural-network training**. It **fits** a TF‑IDF vectorizer on the scholarship texts in the request, then scores similarity.
- In production you’ll typically precompute scholarship vectors and refresh on schedule. This “fit per request” version is ideal for your first milestone demo.

## Intent model training (PyTorch)

The chat endpoint uses **intent** only to choose response shape (eligibility copy, deadline ordering, retrieval thresholds). **Scholarship facts** still come from your corpus + TF‑IDF / optional SBERT retrieval (RAG-style), not from the intent model.

### Baseline: TF‑IDF + small MLP

Train on `app/data/intent_train.csv` (columns `text`, `intent`). Writes validation metrics to `intent_baseline_metrics.json` for reports and comparison.

```bash
python -m app.models.train_intent --data app/data/intent_train.csv --output app/models/artifacts --epochs 30
```

Artifacts:

- `app/models/artifacts/intent_model.pt`
- `app/models/artifacts/label_encoder.pkl`
- `app/models/artifacts/tfidf_vectorizer.pkl`
- `app/models/artifacts/intent_baseline_metrics.json`

### Fine-tuned encoder (recommended for demos / coursework)

Uses **DistilBERT** (default `distilbert-base-uncased`; override with `--model-name`, e.g. `distilroberta-base`). Saves Transformers weights under `intent_hf/`. If `intent_hf/config.json` exists, **inference prefers this model** over the TF‑IDF bundle.

```bash
python -m pip install -r requirements.txt
python -m app.models.train_intent_distilbert --data app/data/intent_train.csv --output app/models/artifacts --epochs 6
```

Also writes `intent_hf_metrics.json` (accuracy, macro F1, confusion matrix, classification report). Compare numerically to `intent_baseline_metrics.json`.

To run the API with **only** the baseline again, remove or rename the `app/models/artifacts/intent_hf` directory.

### Skipping chat LLM fine-tuning

For a coursework narrative: intent fine-tuning + retrieval + rule-based eligibility/deadline text is usually enough. A separate instruct LLM + QLoRA is only worth it if the rubric explicitly requires generative chat beyond templated answers.

