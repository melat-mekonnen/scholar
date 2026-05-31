from __future__ import annotations

import re
from typing import Any, Dict, List

from app.rag.embeddings import scholarship_to_text


# Canonical mapping for country normalization (handles messy user/data input)
_COUNTRY_CANON = {
    "holland": "netherlands",
    "the netherlands": "netherlands",
    "uk": "united kingdom",
    "u k": "united kingdom",
    "usa": "united states",
    "u s": "united states",
    "us": "united states",
    "america": "united states",
}


# Normalize country strings into a standard format
def _norm_country(s: str) -> str:
    t = re.sub(r"\s+", " ", (s or "").strip().lower())
    return _COUNTRY_CANON.get(t, t)


# Normalize education level into structured categories
def normalize_level(raw: str | None) -> str:
    s = (raw or "").lower()
    if re.search(r"\b(phd|doctorate|doctoral)\b", s):
        return "phd"
    if re.search(r"\b(master|masters|msc|m\.sc|ma|mba|postgraduate)\b", s):
        return "master"
    if re.search(r"\b(bachelor|bachelors|undergraduate|b\.?sc|ba)\b", s):
        return "bachelor"
    return "other"


# Normalize funding type into structured categories
def normalize_funding(raw: str | None) -> str:
    s = (raw or "").lower()

    # Strong full funding signals
    if any(x in s for x in ("fully funded", "full funding", "full scholarship", "100%", "full tuition")):
        return "full"

    if "full" in s and ("fund" in s or "cover" in s or "waiv" in s):
        return "full"

    # Partial funding signals
    if any(x in s for x in ("partial", "stipend", "some tuition", "fee reduction")):
        return "partial"

    # No funding cases
    if any(x in s for x in ("not funded", "self-funded", "no funding", "unfunded")):
        return "none"

    if not s.strip():
        return "unknown"

    # Generic fallback classification
    if "fund" in s or "grant" in s or "scholarship" in s:
        return "unspecified"

    return "unknown"


# Split academic field into structured list of disciplines
def _disciplines(field: str | None) -> List[str]:
    if not field:
        return []

    # Split by common separators and conjunctions
    parts = re.split(r"[,;/]|(?:\band\b)|(?:\&)", (field or "").lower())

    out: List[str] = []
    for p in parts:
        t = re.sub(r"\s+", " ", p).strip()
        if len(t) >= 2:
            out.append(t)

    # Limit to avoid noisy explosion of features
    return out[:12]


# Convert raw scholarship row into structured semantic facets for retrieval/ranking
def build_semantic_facets(row: Dict[str, Any]) -> Dict[str, Any]:
    """
    Produces normalized structured metadata used by ranking logic.
    This is what allows semantic matching beyond raw text similarity.
    """

    level = normalize_level(str(row.get("level") or ""))
    funding = normalize_funding(str(row.get("funding_type") or ""))
    country_norm = _norm_country(str(row.get("country") or ""))
    disciplines = _disciplines(str(row.get("field") or ""))

    return {
        "level": level,
        "funding": funding,
        "country_norm": country_norm,
        "disciplines": disciplines,
    }


# Build embedding-ready document combining raw text + semantic labels
def scholarship_retrieval_document(row: Dict[str, Any]) -> str:
    """
    Creates a hybrid representation:
    - raw scholarship text (semantic richness)
    - structured tags (for better embedding alignment)
    """

    base = scholarship_to_text(row)
    f = build_semantic_facets(row)

    # Structured tokens improve retrieval for queries like:
    # "fully funded masters in germany"
    labels = " ".join(
        filter(
            None,
            [
                f"study_level:{f['level']}",
                f"funding:{f['funding']}",
                f"country:{f['country_norm']}",
                ("disciplines:" + " ".join(f["disciplines"])) if f["disciplines"] else "",
            ],
        )
    )

    return f"{base} | {labels}".strip()


# Hybrid scoring: combines structured matching with lexical similarity
def semantic_alignment_score(entities: Dict[str, Any], facets: Dict[str, Any]) -> float:
    """
    Produces a 0–1 compatibility score between:
    - user intent (entities extracted from query)
    - scholarship structured facets

    This is a rule-based semantic boost layered on top of embedding similarity.
    """

    score = 0.0

    # --- degree level matching ---
    want_level = str(entities.get("level") or "").strip().lower()
    got = facets.get("level") or "other"

    if want_level:
        if got == want_level:
            score += 0.38
        elif got == "other":
            score += 0.08  # partial credit if scholarship doesn't specify level
    else:
        score += 0.12  # neutral boost if no preference specified

    # --- field of study matching ---
    want_field = str(entities.get("field") or "").strip().lower()
    boost = str(entities.get("profile_field_boost") or "").strip().lower()
    blob = " ".join(facets.get("disciplines") or [])

    if want_field and blob:
        tokens = [t for t in want_field.replace(",", " ").split() if len(t) > 3]
        if want_field in blob or any(t in blob for t in tokens):
            score += 0.32
    elif boost and blob:
        tokens = [t for t in boost.replace(",", " ").split() if len(t) > 3]
        if boost in blob or any(t in blob for t in tokens):
            score += 0.28

    # --- country matching ---
    want_country = str(entities.get("country") or "").strip().lower()
    cn = str(facets.get("country_norm") or "")

    if want_country and cn:
        w = _norm_country(want_country)
        if w and (w == cn or w in cn or cn in w):
            score += 0.22

    # --- funding type matching ---
    want_funding = str(entities.get("funding_type") or "").strip().lower()
    fd = str(facets.get("funding") or "")

    if want_funding and entities.get("strict_funding"):
        # strict matching mode (higher precision filtering)
        if fd == "full" and ("full" in want_funding or "fully" in want_funding):
            score += 0.20
        elif fd == "partial" and "partial" in want_funding:
            score += 0.20
        elif fd == "none" and ("self" in want_funding or "none" in want_funding):
            score += 0.16

    elif want_funding:
        # relaxed matching mode (soft boost)
        if fd == "full" and ("full" in want_funding or "fully" in want_funding):
            score += 0.10
        elif fd == "partial" and "partial" in want_funding:
            score += 0.08

    # Clamp score to valid probability range
    return max(0.0, min(1.0, score))
