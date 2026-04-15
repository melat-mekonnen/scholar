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
    { "id": "sch_1", "score": 0.7231, "matchedTerms": ["germany", "master", "daad"] }
  ]
}
```

## Notes

- This is **not neural-network training**. It **fits** a TF‑IDF vectorizer on the scholarship texts in the request, then scores similarity.
- In production you’ll typically precompute scholarship vectors and refresh on schedule. This “fit per request” version is ideal for your first milestone demo.

