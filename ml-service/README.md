# ML Recommendation Service

This service trains a lightweight XGBoost-based recommendation model and exposes a recommendation API.

## Setup

Install dependencies:

```bash
python -m pip install -r requirements.txt
```

## Train the model

```bash
python train.py
```

This saves the model to `models/recommendation_model.pkl`.

## Run the API

```bash
uvicorn predict:app --reload --host 0.0.0.0 --port 8000
```

## Recommendation endpoint

POST `/ml/recommend`

Request body:

```json
{
  "studentId": "student-001"
}
```

Response:

```json
[
  {
    "scholarshipId": "scholarship-001",
    "score": 0.91,
    "explanation": "Field of study strongly aligns with the scholarship. ..."
  }
]
```

## Fallback

If the model fails or is unavailable, the service automatically falls back to a semantic search score.
