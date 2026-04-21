# Scholar AI Service (TF‑IDF Recommendations)

This is a small Python service that scores scholarships against a student profile using TF‑IDF + cosine similarity.

## Run locally

```bash
cd scholar-ai
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

Open docs at `http://localhost:8001/docs`.

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

### Trusted RSS / Atom ingestion

- **`POST /ai/feeds/fetch`** — body `{ "feed_urls": ["https://…"] }` (max 20). Returns normalized `{ items: [{ title, description, sourceUrl, sourceName, published }] }` for the backend to store as **pending** scholarships. No web scraping of arbitrary pages; only **feeds you configure**.
- **`POST /ai/discover`** — can include provider **`rss`** plus **`rss_feed_urls`** to rank feed entries against a student profile (same scoring as recommend).

Only add feed URLs you are **allowed** to use (terms of service, robots.txt where applicable). This does not crawl full websites.

## Notes

- Token overlap uses **Unicode** word characters (not ASCII-only), so non‑Latin profiles still score. If token overlap is still empty, the service falls back to **character bigrams** so narrow profiles (e.g. `cs`, `bachelor`) are not stuck at 0% on every card.
- This is **not neural-network training**. It **fits** a TF‑IDF vectorizer on the scholarship texts in the request, then scores similarity.
- In production you’ll typically precompute scholarship vectors and refresh on schedule. This “fit per request” version is ideal for your first milestone demo.

