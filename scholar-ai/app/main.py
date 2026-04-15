from __future__ import annotations

from typing import List, Optional, Dict, Any, Literal

from fastapi import FastAPI
from pydantic import BaseModel, Field
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


app = FastAPI(title="Scholar AI Service", version="0.1.0")


class StudentIn(BaseModel):
    id: Optional[str] = None
    text: str = Field(min_length=1, max_length=8000)


class ScholarshipIn(BaseModel):
    id: str = Field(min_length=1, max_length=200)
    title: str = Field(default="", max_length=500)
    description: str = Field(default="", max_length=20000)
    meta: Optional[Dict[str, Any]] = None


class RecommendRequest(BaseModel):
    student: StudentIn
    scholarships: List[ScholarshipIn] = Field(min_length=1, max_length=500)
    topN: int = Field(default=10, ge=1, le=50)
    includeMatchedTerms: bool = True


class RecommendResult(BaseModel):
    id: str
    score: float
    matchedTerms: Optional[List[str]] = None


class RecommendResponse(BaseModel):
    results: List[RecommendResult]

class StudentProfileIn(BaseModel):
    fieldOfStudy: Optional[str] = None
    degreeLevel: Optional[str] = None
    gpa: Optional[float] = None
    interests: Optional[List[str]] = None
    preferredCountry: Optional[str] = None


class DiscoverRequest(BaseModel):
    student: StudentProfileIn
    topN: int = Field(default=20, ge=1, le=50)
    providers: Optional[List[Literal["mock"]]] = None


class DiscoveredScholarship(BaseModel):
    title: str
    description: str
    country: Optional[str] = None
    degreeLevel: Optional[str] = None
    fieldOfStudy: Optional[str] = None
    deadline: Optional[str] = None  # ISO date string if available
    sourceName: str
    sourceUrl: str
    confidence: float
    matchedTerms: Optional[List[str]] = None


class DiscoverResponse(BaseModel):
    query: str
    results: List[DiscoveredScholarship]


def _student_query_from_profile(p: StudentProfileIn) -> str:
    parts: List[str] = []
    if p.fieldOfStudy:
        parts.append(p.fieldOfStudy)
    if p.degreeLevel:
        parts.append(p.degreeLevel)
    if p.preferredCountry:
        parts.append(p.preferredCountry)
    if p.interests:
        parts.extend([i for i in p.interests if i])
    parts.append("scholarship")
    parts.append("2026")
    return " ".join([x.strip() for x in parts if x and x.strip()])


def _scholarship_text(s: ScholarshipIn) -> str:
    # Keep it simple and robust for messy data.
    title = (s.title or "").strip()
    desc = (s.description or "").strip()
    if title and desc:
        return f"{title}\n{desc}"
    return title or desc or ""


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/ai/recommend", response_model=RecommendResponse)
def recommend(req: RecommendRequest):
    # Build corpus
    corpus = [_scholarship_text(s) for s in req.scholarships]
    student_text = req.student.text.strip()

    # Fit TF‑IDF on scholarship corpus (+ student query to avoid OOV edge cases)
    vectorizer = TfidfVectorizer(
        lowercase=True,
        stop_words="english",
        max_features=50000,
        ngram_range=(1, 2),
    )
    matrix = vectorizer.fit_transform(corpus + [student_text])

    sch_matrix = matrix[:-1]
    student_vec = matrix[-1]

    # Cosine similarity
    scores = cosine_similarity(student_vec, sch_matrix).flatten()

    # Sort indices by score desc
    ranked = sorted(range(len(req.scholarships)), key=lambda i: float(scores[i]), reverse=True)
    ranked = ranked[: req.topN]

    matched_terms_by_idx: Dict[int, List[str]] = {}
    if req.includeMatchedTerms:
        # Matched terms: intersection of non-zero features in student vector and scholarship vector
        feature_names = vectorizer.get_feature_names_out()
        student_nz = set(student_vec.nonzero()[1].tolist())
        for i in ranked:
            sch_nz = set(sch_matrix[i].nonzero()[1].tolist())
            common = list(student_nz.intersection(sch_nz))
            # Pick top terms by TF‑IDF weight in the scholarship vector
            # (fast enough for small lists)
            weights = sch_matrix[i].toarray().flatten()
            common_sorted = sorted(common, key=lambda j: float(weights[j]), reverse=True)
            matched_terms_by_idx[i] = [str(feature_names[j]) for j in common_sorted[:8]]

    results: List[RecommendResult] = []
    for i in ranked:
        s = req.scholarships[i]
        results.append(
            RecommendResult(
                id=s.id,
                score=float(scores[i]),
                matchedTerms=matched_terms_by_idx.get(i) if req.includeMatchedTerms else None,
            )
        )

    return RecommendResponse(results=results)


def _mock_external_scholarships() -> List[Dict[str, Any]]:
    # Safe, offline demo provider. Replace/add real providers later (APIs, RSS, scraping).
    return [
        {
            "title": "DAAD Scholarship",
            "description": "Funding opportunities for international Master and PhD students in Germany in various fields.",
            "country": "Germany",
            "degreeLevel": "master",
            "fieldOfStudy": "Computer Science",
            "deadline": "2026-11-20",
            "sourceName": "MockProvider",
            "sourceUrl": "https://example.com/daad",
        },
        {
            "title": "Erasmus Mundus Joint Masters",
            "description": "Fully funded joint Master's programmes offered by a consortium of universities across Europe.",
            "country": "Europe",
            "degreeLevel": "master",
            "fieldOfStudy": "Engineering",
            "deadline": "2026-01-10",
            "sourceName": "MockProvider",
            "sourceUrl": "https://example.com/erasmus",
        },
        {
            "title": "Chevening Scholarship",
            "description": "UK government scholarship for future leaders to pursue a one-year Master's in the United Kingdom.",
            "country": "United Kingdom",
            "degreeLevel": "master",
            "fieldOfStudy": "Public Policy",
            "deadline": "2026-12-01",
            "sourceName": "MockProvider",
            "sourceUrl": "https://example.com/chevening",
        },
    ]


@app.post("/ai/discover", response_model=DiscoverResponse)
def discover(req: DiscoverRequest):
    query = _student_query_from_profile(req.student)

    providers = req.providers or ["mock"]
    raw: List[Dict[str, Any]] = []
    if "mock" in providers:
        raw.extend(_mock_external_scholarships())

    # De-dup by sourceUrl (best-effort)
    seen = set()
    deduped = []
    for r in raw:
        k = (r.get("sourceUrl") or "").strip().lower()
        if not k or k in seen:
            continue
        seen.add(k)
        deduped.append(r)

    # Rank by TF‑IDF between query and title+description
    items = [
        ScholarshipIn(
            id=str(i),
            title=str(r.get("title") or ""),
            description=str(r.get("description") or ""),
            meta=r,
        )
        for i, r in enumerate(deduped)
        if str(r.get("title") or "").strip() or str(r.get("description") or "").strip()
    ]
    if not items:
        return DiscoverResponse(query=query, results=[])

    rec = recommend(
        RecommendRequest(
            student=StudentIn(id=None, text=query),
            scholarships=items,
            topN=min(req.topN, len(items)),
            includeMatchedTerms=True,
        )
    )

    by_id = {s.id: s for s in items}
    results: List[DiscoveredScholarship] = []
    for row in rec.results:
        s = by_id.get(row.id)
        if not s:
            continue
        m = s.meta or {}
        results.append(
            DiscoveredScholarship(
                title=str(m.get("title") or s.title or ""),
                description=str(m.get("description") or s.description or ""),
                country=m.get("country"),
                degreeLevel=m.get("degreeLevel"),
                fieldOfStudy=m.get("fieldOfStudy"),
                deadline=m.get("deadline"),
                sourceName=str(m.get("sourceName") or "Unknown"),
                sourceUrl=str(m.get("sourceUrl") or ""),
                confidence=float(row.score),
                matchedTerms=row.matchedTerms or [],
            )
        )

    return DiscoverResponse(query=query, results=results)

