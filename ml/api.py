from fastapi import FastAPI
from pydantic import BaseModel
from transformers import pipeline
import joblib
import numpy as np
import re

# --- Load candidate verification model ---
model_bundle = joblib.load("model.pkl")
model = model_bundle["model"]
scaler = model_bundle["scaler"]
columns = model_bundle["columns"]

# --- NLP pipelines ---
ner_pipeline = pipeline("ner", model="dslim/bert-base-NER", grouped_entities=True)
classifier_pipeline = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")
summarizer = pipeline("summarization", model="facebook/bart-large-cnn")

app = FastAPI()

class Features(BaseModel):
    has_official_domain: int
    has_deadline: int
    has_eligibility: int
    has_contact_info: int
    keyword_density: float
    content_length: int
    is_https: int

class StudentProfile(BaseModel):
    field: str
    gpa: float
    country: str
    financial_need: bool

class Scholarship(BaseModel):
    field: str
    location: str
    funding: str
    requirements: dict

class ExtractRequest(BaseModel):
    text: str

FIELD_LABELS = [
    "Computer Science",
    "Engineering",
    "Business",
    "Data Science",
    "Medicine",
    "Arts",
    "Law",
    "Mathematics",
    "Environmental Science",
    "Social Sciences",
]

DEGREE_LEVEL_LABELS = [
    "High School",
    "Bachelor",
    "Master",
    "PhD",
    "Doctoral",
    "Undergraduate",
    "Graduate",
]

FUNDING_LABELS = [
    "Full",
    "Partial",
    "Tuition",
    "Stipend",
    "Travel",
    "Living expenses",
]

COUNTRY_KEYWORDS = [
    "Germany",
    "USA",
    "United Kingdom",
    "Canada",
    "Australia",
    "Netherlands",
    "France",
    "Switzerland",
    "Sweden",
    "Japan",
]

def extract_title(text: str) -> str:
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    if lines:
        title_line = lines[0]
        if len(title_line.split()) <= 12 and any(word.lower() in title_line.lower() for word in ["scholarship", "fellowship", "grant"]):
            return title_line
    match = re.search(r"([A-Z][A-Za-z0-9 &,\-']+scholarship)", text, re.IGNORECASE)
    if match:
        return match.group(1).strip()
    return title_line if lines else "Scholarship Opportunity"

def extract_deadline(text: str) -> str | None:
    patterns = [
        r"([0-9]{4}-[0-9]{2}-[0-9]{2})",
        r"([0-9]{1,2} [A-Za-z]+ [0-9]{4})",
        r"([A-Za-z]+ [0-9]{1,2}, [0-9]{4})",
    ]
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            return match.group(1)
    return None

def extract_country(text: str) -> str | None:
    ner = ner_pipeline(text[:1000])
    for entity in ner:
        if entity.get("entity_group") in ["LOC", "GPE"]:
            candidate = entity.get("word")
            if candidate:
                return candidate
    for country in COUNTRY_KEYWORDS:
        if country.lower() in text.lower():
            return country
    return None

def extract_requirements(text: str) -> list[str]:
    requirements = []
    keys = ["IELTS", "TOEFL", "GRE", "GPA", "transcript", "resume", "CV", "letter of recommendation", "motivation letter", "statement of purpose"]
    for key in keys:
        if re.search(rf"\b{re.escape(key)}\b", text, re.IGNORECASE):
            requirements.append(key)
    return list(dict.fromkeys(requirements))

def extract_degree_level(text: str) -> str | None:
    result = classifier_pipeline(text[:500], DEGREE_LEVEL_LABELS)
    return result["labels"][0] if result["scores"][0] > 0.4 else None

def extract_field(text: str) -> str | None:
    result = classifier_pipeline(text[:500], FIELD_LABELS)
    return result["labels"][0] if result["scores"][0] > 0.35 else None

def extract_funding_type(text: str) -> str | None:
    result = classifier_pipeline(text[:500], FUNDING_LABELS)
    label = result["labels"][0]
    if result["scores"][0] > 0.35:
        return label
    if re.search(r"fully funded|full funding|covers tuition|covers living expenses", text, re.IGNORECASE):
        return "Full"
    if re.search(r"partially funded|partial funding", text, re.IGNORECASE):
        return "Partial"
    return None

def extract_summary(text: str) -> str | None:
    safe_text = text[:800]
    try:
        summary = summarizer(safe_text, max_length=120, min_length=30, do_sample=False)
        return summary[0]["summary_text"].strip()
    except Exception:
        return None

def process_features(features: dict):
    arr = np.array([
        features["has_official_domain"],
        features["has_deadline"],
        features["has_eligibility"],
        features["has_contact_info"],
        features["keyword_density"],
        features["content_length"],
        features["is_https"]
    ]).reshape(1, -1)
    arr[:, 4] = scaler.transform(arr[:, 4].reshape(-1, 1)).flatten()
    arr[:, 5] = scaler.transform(arr[:, 5].reshape(-1, 1)).flatten()
    return arr

# --- TASK 6: Prediction function ---
def predict_candidate(features: dict):
    arr = process_features(features)
    prob = model.predict_proba(arr)[0, 1]
    label = "valid" if prob >= 0.5 else "invalid"
    return {"score": float(round(prob, 4)), "label": label}

@app.post("/predict")
def predict(features: Features):
    return predict_candidate(features.dict())

@app.post("/extract")
def extract(request: ExtractRequest):
    text = request.text.strip()
    title = extract_title(text)
    deadline = extract_deadline(text)
    funding_type = extract_funding_type(text)
    degree_level = extract_degree_level(text)
    field_of_study = extract_field(text)
    country = extract_country(text)
    requirements = extract_requirements(text)
    description = extract_summary(text)
    return {
        "title": title,
        "deadline": deadline,
        "funding_type": funding_type,
        "degree_level": degree_level,
        "field_of_study": field_of_study,
        "country": country,
        "requirements": requirements,
        "description": description,
    }

# --- Recommendation Scoring ---
def calculate_match_score(student: dict, scholarship: dict):
    score = 0
    explanations = []
    warnings = []

    if student.get('field') and scholarship.get('field') and student['field'].lower() == scholarship['field'].lower():
        score += 30
        explanations.append(f"Your field matches {scholarship['field']}")

    gpa_req = scholarship.get('requirements', {}).get('gpa')
    if gpa_req and student.get('gpa', 0) >= gpa_req:
        score += 25
        explanations.append(f"Your GPA ({student['gpa']}) meets the minimum requirement ({gpa_req})")
    elif gpa_req and student.get('gpa', 0) < gpa_req:
        warnings.append(f"Your GPA ({student['gpa']}) is below the minimum requirement ({gpa_req})")
    elif not gpa_req:
        warnings.append("GPA requirement not specified in scholarship")

    if student.get('financial_need') and scholarship.get('funding') and 'full' in scholarship['funding'].lower():
        score += 20
        explanations.append("This scholarship is fully funded, matching your financial need")
    elif student.get('financial_need') and (not scholarship.get('funding') or 'full' not in scholarship['funding'].lower()):
        warnings.append("Scholarship funding may not cover full financial need")

    if student.get('country') and scholarship.get('location') and student['country'].lower() in scholarship['location'].lower():
        score += 25
        explanations.append(f"Scholarship location ({scholarship['location']}) matches your country ({student['country']})")
    elif student.get('country') and scholarship.get('location'):
        warnings.append(f"Scholarship location ({scholarship['location']}) does not match your country ({student['country']})")

    score = min(score, 100)

    return {"score": score, "explanations": explanations, "warnings": warnings}

@app.post("/recommend")
def recommend(student: StudentProfile, scholarship: Scholarship):
    return calculate_match_score(student.dict(), scholarship.dict())
