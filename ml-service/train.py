import hashlib
import json
import logging
from datetime import datetime
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, confusion_matrix, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier

ROOT_DIR = Path(__file__).resolve().parent
DATA_DIR = ROOT_DIR / "data"
MODEL_DIR = ROOT_DIR / "models"
MODEL_PATH = MODEL_DIR / "recommendation_model.pkl"
MODEL_VERSION = datetime.utcnow().strftime("v%Y%m%d%H%M%S")
METRICS_PATH = MODEL_DIR / "metrics.json"
FEATURE_IMPORTANCE_PATH = MODEL_DIR / "feature_importance.json"
MODEL_REGISTRY_PATH = MODEL_DIR / "model_registry.json"

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

DEGREE_RANK = {
    "high_school": 0,
    "bachelor": 1,
    "master": 2,
    "phd": 3,
}


def load_json(name: str):
    path = DATA_DIR / name
    if not path.exists():
        raise FileNotFoundError(f"Dataset file not found: {path}")
    return json.loads(path.read_text(encoding="utf-8"))


def normalize_text(value: str | None) -> str:
    if not value:
        return ""
    return value.strip().lower()


def parse_gpa(value) -> float:
    try:
        if value is None:
            return 0.0
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def degree_match(student_degree: str | None, scholarship_degree: str | None) -> float:
    if not student_degree or not scholarship_degree:
        return 0.0
    student_rank = DEGREE_RANK.get(student_degree.lower(), None)
    scholarship_rank = DEGREE_RANK.get(scholarship_degree.lower(), None)
    if student_rank is None or scholarship_rank is None:
        return 0.0
    if student_rank == scholarship_rank:
        return 1.0
    return max(0.0, 1.0 - abs(student_rank - scholarship_rank) * 0.33)


def jaccard_similarity(a: str, b: str) -> float:
    if not a or not b:
        return 0.0
    tokens_a = set(normalize_text(a).split())
    tokens_b = set(normalize_text(b).split())
    if not tokens_a or not tokens_b:
        return 0.0
    intersection = tokens_a.intersection(tokens_b)
    union = tokens_a.union(tokens_b)
    return len(intersection) / len(union)


def funding_match(student: dict, scholarship: dict) -> float:
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


def build_features(student: dict, scholarship: dict):
    student_gpa = parse_gpa(student.get("gpa"))
    scholarship_gpa = parse_gpa(scholarship.get("gpa_requirement"))
    gpa_similarity = 0.5
    if scholarship_gpa > 0:
        gpa_similarity = max(0.0, 1.0 - abs(student_gpa - scholarship_gpa) / 4.0)

    country_match = 1.0 if normalize_text(student.get("preferred_country")) == normalize_text(scholarship.get("country")) else 0.0
    field_similarity = max(
        jaccard_similarity(student.get("field_of_study"), scholarship.get("field_of_study")),
        jaccard_similarity(student.get("preferred_funding_type"), scholarship.get("funding_type")),
    )
    degree_similarity = degree_match(student.get("degree_level"), scholarship.get("degree_level"))
    funding_similarity = funding_match(student, scholarship)
    interest_similarity = 0.0
    student_interests = [normalize_text(i) for i in student.get("interests", []) if i]
    scholarship_tags = normalize_text(scholarship.get("field_of_study"))
    if student_interests and scholarship_tags:
        tokens = set(scholarship_tags.split())
        matches = set(student_interests).intersection(tokens)
        interest_similarity = len(matches) / max(1, len(set(student_interests)))

    return {
        "gpa_similarity": gpa_similarity,
        "country_match": country_match,
        "degree_similarity": degree_similarity,
        "field_similarity": field_similarity,
        "funding_similarity": funding_similarity,
        "interest_similarity": interest_similarity,
        "student_gpa": student_gpa,
        "scholarship_gpa": scholarship_gpa,
        "scholarship_full_funding": 1.0 if "full" in normalize_text(scholarship.get("funding_type")) else 0.0,
        "has_gpa_requirement": 1.0 if scholarship_gpa > 0 else 0.0,
    }


def build_dataset(students: list[dict], scholarships: list[dict], interactions: list[dict]) -> pd.DataFrame:
    student_map = {student["id"]: student for student in students}
    scholarship_map = {scholarship["id"]: scholarship for scholarship in scholarships}
    interaction_set = {(item["student_id"], item["scholarship_id"]) for item in interactions}

    rows = []
    for student_id, student in student_map.items():
        for scholarship_id, scholarship in scholarship_map.items():
            label = 1 if (student_id, scholarship_id) in interaction_set else 0
            row = build_features(student, scholarship)
            row.update({"student_id": student_id, "scholarship_id": scholarship_id, "label": label})
            rows.append(row)

    if not rows:
        raise ValueError("No student-scholarship pairs found for training")

    df = pd.DataFrame(rows)
    return df


def load_samples() -> tuple[list[dict], list[dict], list[dict]]:
    try:
        students = load_json("students.json")
        scholarships = load_json("scholarships.json")
        interactions = load_json("interactions.json")
        return students, scholarships, interactions
    except FileNotFoundError as exc:
        logging.warning("Sample data files not found: %s", exc)
        return [], [], []


def save_json(path: Path, data: dict):
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")


def calculate_dataset_version(students: list[dict], scholarships: list[dict], interactions: list[dict]) -> str:
    digest = hashlib.sha256()
    summary = {
        "students": len(students),
        "scholarships": len(scholarships),
        "interactions": len(interactions),
        "generated_at": datetime.utcnow().isoformat(),
    }
    digest.update(json.dumps(summary, sort_keys=True).encode("utf-8"))
    return f"dataset-{digest.hexdigest()[:10]}"


def load_registry() -> list[dict]:
    if MODEL_REGISTRY_PATH.exists():
        return json.loads(MODEL_REGISTRY_PATH.read_text(encoding="utf-8"))
    return []


def save_registry(entries: list[dict]):
    save_json(MODEL_REGISTRY_PATH, entries)


def train():
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    students, scholarships, interactions = load_samples()

    if not students or not scholarships or not interactions:
        raise RuntimeError(
            "Missing sample training data. Ensure data/students.json, data/scholarships.json, and data/interactions.json exist."
        )

    df = build_dataset(students, scholarships, interactions)
    feature_columns = [
        "gpa_similarity",
        "country_match",
        "degree_similarity",
        "field_similarity",
        "funding_similarity",
        "interest_similarity",
        "student_gpa",
        "scholarship_gpa",
        "scholarship_full_funding",
        "has_gpa_requirement",
    ]

    X = df[feature_columns].astype(float)
    y = df["label"].astype(int)

    if len(y.unique()) < 2:
        raise RuntimeError("Training requires both positive and negative labels in the dataset.")

    class_counts = y.value_counts().to_dict()
    positive_count = int(class_counts.get(1, 0))
    negative_count = int(class_counts.get(0, 0))
    scale_pos_weight = max(1.0, negative_count / max(1, positive_count))

    stratify = y if y.nunique() > 1 else None
    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.20,
        random_state=42,
        stratify=stratify,
    )

    model = XGBClassifier(
        use_label_encoder=False,
        eval_metric="logloss",
        n_estimators=100,
        max_depth=4,
        random_state=42,
        scale_pos_weight=scale_pos_weight,
    )
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1] if hasattr(model, "predict_proba") else None

    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred, zero_division=0)
    recall = recall_score(y_test, y_pred, zero_division=0)
    roc_auc = roc_auc_score(y_test, y_proba) if y_proba is not None else None
    conf_matrix = confusion_matrix(y_test, y_pred).tolist()

    importance_data = []
    if hasattr(model, "feature_importances_"):
        importance_data = sorted(
            [
                {"feature": feature, "importance": float(model.feature_importances_[idx])}
                for idx, feature in enumerate(feature_columns)
            ],
            key=lambda item: item["importance"],
            reverse=True,
        )

    dataset_version = calculate_dataset_version(students, scholarships, interactions)
    metrics = {
        "modelVersion": MODEL_VERSION,
        "datasetVersion": dataset_version,
        "datasetSummary": {
            "students": len(students),
            "scholarships": len(scholarships),
            "interactions": len(interactions),
            "positiveLabels": positive_count,
            "negativeLabels": negative_count,
        },
        "classBalance": {
            "scalePosWeight": scale_pos_weight,
            "ratio": f"{negative_count}:{positive_count}",
        },
        "trainingSize": len(X_train),
        "validationSize": len(X_test),
        "accuracy": accuracy,
        "precision": precision,
        "recall": recall,
        "rocAuc": roc_auc,
        "confusionMatrix": conf_matrix,
        "featureColumns": feature_columns,
        "trainedAt": datetime.utcnow().isoformat() + "Z",
    }

    model_snapshot_path = MODEL_DIR / f"recommendation_model_{MODEL_VERSION}.pkl"
    joblib.dump(
        {
            "model": model,
            "feature_columns": feature_columns,
            "version": MODEL_VERSION,
            "metadata": {
                "datasetVersion": dataset_version,
                "metrics": metrics,
            },
        },
        model_snapshot_path,
    )
    joblib.dump(
        {
            "model": model,
            "feature_columns": feature_columns,
            "version": MODEL_VERSION,
            "metadata": {
                "datasetVersion": dataset_version,
                "metrics": metrics,
            },
        },
        MODEL_PATH,
    )

    save_json(METRICS_PATH, metrics)
    save_json(FEATURE_IMPORTANCE_PATH, {"modelVersion": MODEL_VERSION, "importance": importance_data})

    registry = load_registry()
    registry = [
        {**entry, "isActive": False} for entry in registry
    ]
    registry.append({
        "version": MODEL_VERSION,
        "createdAt": datetime.utcnow().isoformat() + "Z",
        "datasetVersion": dataset_version,
        "metricsPath": METRICS_PATH.name,
        "featureImportancePath": FEATURE_IMPORTANCE_PATH.name,
        "modelPath": model_snapshot_path.name,
        "isActive": True,
    })
    save_registry(registry)

    logging.info("Model saved to %s", MODEL_PATH)
    logging.info("Snapshot saved to %s", model_snapshot_path)
    logging.info("Training metrics: accuracy=%.4f precision=%.4f recall=%.4f roc_auc=%s", accuracy, precision, recall, roc_auc)
    logging.info("Feature columns: %s", feature_columns)
    logging.info("Class balance: %s", metrics["classBalance"])


if __name__ == "__main__":
    train()
