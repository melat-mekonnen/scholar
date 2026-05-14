from __future__ import annotations

import re
from typing import Any, Dict, List

from app.rag.embeddings import scholarship_to_text

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


def _norm_country(s: str) -> str:
    t = re.sub(r"\s+", " ", (s or "").strip().lower())
    return _COUNTRY_CANON.get(t, t)


def normalize_level(raw: str | None) -> str:
    s = (raw or "").lower()
    if re.search(r"\b(phd|doctorate|doctoral)\b", s):
        return "phd"
    if re.search(r"\b(master|masters|msc|m\.sc|ma|mba|postgraduate)\b", s):
        return "master"
    if re.search(r"\b(bachelor|bachelors|undergraduate|b\.?sc|ba)\b", s):
        return "bachelor"
    return "other"


def normalize_funding(raw: str | None) -> str:
    s = (raw or "").lower()
    if any(x in s for x in ("fully funded", "full funding", "full scholarship", "100%", "full tuition")):
        return "full"
    if "full" in s and ("fund" in s or "cover" in s or "waiv" in s):
        return "full"
    if any(x in s for x in ("partial", "stipend", "some tuition", "fee reduction")):
        return "partial"
    if any(x in s for x in ("not funded", "self-funded", "no funding", "unfunded")):
        return "none"
    if not s.strip():
        return "unknown"
    if "fund" in s or "grant" in s or "scholarship" in s:
        return "unspecified"
    return "unknown"


def _disciplines(field: str | None) -> List[str]:
    if not field:
        return []
    parts = re.split(r"[,;/]|(?:\band\b)|(?:\&)", (field or "").lower())
    out: List[str] = []
    for p in parts:
        t = re.sub(r"\s+", " ", p).strip()
        if len(t) >= 2:
            out.append(t)
    return out[:12]


def build_semantic_facets(row: Dict[str, Any]) -> Dict[str, Any]:
    """
    Canonical, JSON-serializable view of a scholarship for retrieval, ranking, and clients.
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


def scholarship_retrieval_document(row: Dict[str, Any]) -> str:
    """Dense text for embedding / TF‑IDF: raw row plus explicit semantic labels."""
    base = scholarship_to_text(row)
    f = build_semantic_facets(row)
    labels = " ".join(
        [
            f"study_level:{f['level']}",
            f"funding:{f['funding']}",
            f"country:{f['country_norm']}",
            "disciplines:" + " ".join(f["disciplines"]) if f["disciplines"] else "",
        ]
    )
    return f"{base} | {labels}".strip()


def semantic_alignment_score(entities: Dict[str, Any], facets: Dict[str, Any]) -> float:
    """
    0–1 alignment between extracted entities / profile hints and semantic facets.
    Complements lexical similarity (TF‑IDF / SBERT) with typed agreement.
    """
    score = 0.0

    want_level = str(entities.get("level") or "").strip().lower()
    got = facets.get("level") or "other"
    if want_level:
        if got == want_level:
            score += 0.38
        elif got == "other":
            score += 0.08
    else:
        score += 0.12

    want_field = str(entities.get("field") or "").strip().lower()
    boost = str(entities.get("profile_field_boost") or "").strip().lower()
    blob = " ".join(facets.get("disciplines") or [])
    if want_field and blob:
        if want_field in blob or any(len(t) > 3 and t in blob for t in want_field.replace(",", " ").split()):
            score += 0.32
    elif boost and blob:
        if boost in blob or any(len(t) > 3 and t in blob for t in boost.replace(",", " ").split()):
            score += 0.28

    want_country = str(entities.get("country") or "").strip().lower()
    cn = str(facets.get("country_norm") or "")
    if want_country and cn:
        w = _norm_country(want_country)
        if w and (w == cn or w in cn or cn in w):
            score += 0.22

    want_funding = str(entities.get("funding_type") or "").strip().lower()
    fd = str(facets.get("funding") or "")
    if want_funding and entities.get("strict_funding"):
        if fd == "full" and ("full" in want_funding or "fully" in want_funding):
            score += 0.2
        elif fd == "partial" and "partial" in want_funding:
            score += 0.2
        elif fd == "none" and ("self" in want_funding or "none" in want_funding):
            score += 0.16
    elif want_funding:
        if fd == "full" and ("full" in want_funding or "fully" in want_funding):
            score += 0.1
        elif fd == "partial" and "partial" in want_funding:
            score += 0.08

    return max(0.0, min(1.0, score))
