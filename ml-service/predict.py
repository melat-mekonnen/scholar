import json
import logging
import time
from pathlib import Path
from typing import Any

import joblib
from fastapi import FastAPI, HTTPException, Response
from pydantic import BaseModel

ROOT_DIR = Path(__file__).resolve().parent
MODEL_PATH = ROOT_DIR / "models" / "recommendation_model.pkl"
DATA_DIR = ROOT_DIR / "data"

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("ml-service")

app = FastAPI(title="Scholarship Recommendation Service")


class RecommendationRequest(BaseModel):
    studentId: str
    studentProfile: dict[str, Any] | None = None
    scholarships: list[dict[str, Any]] | None = None


class RecommendationItem(BaseModel):
    scholarshipId: str
    score: float
    explanation: str


def load_json(name: str):
    path = DATA_DIR / name
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else []


def normalize_text(value: str | None) -> str:
    return value.strip().lower() if isinstance(value, str) else ""


def parse_gpa(value) -> float:
    try:
        if value is None:
            return 0.0
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def jaccard_similarity(a: str, b: str) -> float:
    if not a or not b:
        return 0.0
    tokens_a = set(normalize_text(a).split())
    tokens_b = set(normalize_text(b).split())
    if not tokens_a or not tokens_b:
        return 0.0
    return len(tokens_a.intersection(tokens_b)) / len(tokens_a.union(tokens_b))


def degree_match(student_degree: str | None, scholarship_degree: str | None) -> float:
    rank = {"high_school": 0, "bachelor": 1, "master": 2, "phd": 3}
    if not student_degree or not scholarship_degree:
        return 0.0
    student_rank = rank.get(normalize_text(student_degree))
    scholarship_rank = rank.get(normalize_text(scholarship_degree))
    if student_rank is None or scholarship_rank is None:
        return 0.0
    if student_rank == scholarship_rank:
        return 1.0
    return max(0.0, 1.0 - abs(student_rank - scholarship_rank) * 0.33)


def funding_match(student: dict[str, Any], scholarship: dict[str, Any]) -> float:
    funding = normalize_text(scholarship.get("funding_type"))
    preferred = normalize_text(student.get("preferred_funding_type"))
    if not funding:
        return 0.0
    if preferred and preferred in funding:
        return 1.0
    if "full" in funding:
        return 0.8 if student.get("financial_need") else 0.6
    if "partial" in funding:
        return 0.5
    return 0.2


def build_features(student: dict[str, Any], scholarship: dict[str, Any]) -> dict[str, float]:
    student_gpa = parse_gpa(student.get("gpa"))
    scholarship_gpa = parse_gpa(scholarship.get("gpa_requirement"))
    gpa_similarity = 0.5
    if scholarship_gpa > 0:
        gpa_similarity = max(0.0, 1.0 - abs(student_gpa - scholarship_gpa) / 4.0)

    country_match = 1.0 if normalize_text(student.get("preferred_country")) == normalize_text(scholarship.get("country")) else 0.0
    field_similarity = max(
        jaccard_similarity(student.get("field_of_study"), scholarship.get("field_of_study")),
        jaccard_similarity(student.get("linked_interest"), scholarship.get("field_of_study")) if student.get("linked_interest") else 0.0,
    )
    funding_similarity = funding_match(student, scholarship)
    interest_similarity = 0.0
    if isinstance(student.get("interests"), list) and scholarship.get("field_of_study"):
        interests = {normalize_text(item) for item in student.get("interests", []) if item}
        tags = set(normalize_text(scholarship.get("field_of_study")).split())
        interest_similarity = len(interests.intersection(tags)) / max(1, len(interests)) if interests else 0.0

    return {
        "gpa_similarity": gpa_similarity,
        "country_match": country_match,
        "degree_similarity": degree_match(student.get("degree_level"), scholarship.get("degree_level")),
        "field_similarity": field_similarity,
        "funding_similarity": funding_similarity,
        "interest_similarity": interest_similarity,
        "student_gpa": student_gpa,
        "scholarship_gpa": scholarship_gpa,
        "scholarship_full_funding": 1.0 if "full" in normalize_text(scholarship.get("funding_type")) else 0.0,
        "has_gpa_requirement": 1.0 if scholarship_gpa > 0 else 0.0,
    }


def explain_prediction(student: dict[str, Any], scholarship: dict[str, Any], score: float) -> str:
    explanations = []
    if normalize_text(student.get("field_of_study")) and normalize_text(scholarship.get("field_of_study")):
        if field_similarity := jaccard_similarity(student.get("field_of_study"), scholarship.get("field_of_study")):
            if field_similarity >= 0.7:
                explanations.append("Field of study strongly aligns with the scholarship.")
            elif field_similarity >= 0.4:
                explanations.append("Field of study is a reasonable match.")
    if normalize_text(student.get("preferred_country")) and normalize_text(scholarship.get("country")) == normalize_text(student.get("preferred_country")):
        explanations.append("Country preference matches the scholarship location.")
    if degree_match(student.get("degree_level"), scholarship.get("degree_level")) >= 0.9:
        explanations.append("Degree level matches the scholarship requirement.")
    if funding_match(student, scholarship) >= 0.8:
        explanations.append("Funding alignment is strong.")
    if parse_gpa(student.get("gpa")) >= parse_gpa(scholarship.get("gpa_requirement")) and parse_gpa(scholarship.get("gpa_requirement")) > 0:
        explanations.append("Your GPA meets or exceeds the scholarship requirement.")
    if not explanations:
        explanations.append("This recommendation is based on profile and scholarship compatibility.")
    explanations.append(f"ML confidence score is {score:.3f}.")
    return " ".join(explanations)


def semantic_search_fallback(student: dict[str, Any], scholarships: list[dict[str, Any]]) -> list[dict[str, Any]]:
    fallback = []
    query_tokens = set(normalize_text(student.get("field_of_study", "") + " " + " ".join(student.get("interests", []))).split())
    for scholarship in scholarships:
        text = normalize_text(scholarship.get("title", "") + " " + scholarship.get("description", ""))
        overlap = len(query_tokens.intersection(set(text.split())))
        score = overlap / max(1, len(text.split()))
        fallback.append(
            {
                "scholarshipId": scholarship.get("id"),
                "score": round(float(score), 3),
                "explanation": "Fallback semantic search used because model prediction was not available.",
            }
        )
    return sorted(fallback, key=lambda item: item["score"], reverse=True)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "modelVersion": model_version,
        "modelLoaded": model is not None,
    }


try:
    model_bundle = joblib.load(MODEL_PATH)
    model = model_bundle["model"]
    feature_columns = model_bundle["feature_columns"]
    model_version = model_bundle.get("version", "unknown")
    logger.info("Loaded recommendation model version %s", model_version)
except Exception as exc:
    logger.warning("Failed to load model at startup: %s", exc)
    model = None
    feature_columns = []
    model_version = "none"


@app.post("/ml/recommend", response_model=list[RecommendationItem])
def recommend(request: RecommendationRequest, response: Response):
    start = time.perf_counter()
    response.headers["X-Model-Version"] = model_version
    students = load_json("students.json")
    scholarships = load_json("scholarships.json")

    student = None
    if request.studentProfile:
        student = request.studentProfile
    else:
        student = next((s for s in students if s.get("id") == request.studentId), None)

    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    candidates = request.scholarships or scholarships
    if not candidates:
        raise HTTPException(status_code=404, detail="No scholarship candidates available")

    try:
        if model is None:
            raise RuntimeError("Model not loaded")

        items = []
        feature_rows = []
        for scholarship in candidates:
            features = build_features(student, scholarship)
            feature_rows.append(features)

        scores = model.predict_proba([list(row.values()) for row in feature_rows])[:, 1]
        for scholarship, score in zip(candidates, scores):
            explanation = explain_prediction(student, scholarship, float(score))
            items.append(
                {
                    "scholarshipId": scholarship.get("id"),
                    "score": round(float(score), 4),
                    "explanation": explanation,
                }
            )
    except Exception as exc:
        logger.exception("ML model failed, using fallback: %s", exc)
        items = semantic_search_fallback(student, candidates)

    items = sorted(items, key=lambda result: result["score"], reverse=True)
    latency_ms = (time.perf_counter() - start) * 1000
    confidence_values = [item["score"] for item in items]
    logger.info(
        "recommendation request studentId=%s latency_ms=%.2f model_version=%s confidence_scores=%s",
        request.studentId,
        latency_ms,
        model_version,
        confidence_values,
    )
    return items
