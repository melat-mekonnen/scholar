from __future__ import annotations

import re
from typing import List, Dict, Any

from app.rag.semantic_model import build_semantic_facets, semantic_alignment_score
from app.utils.deadline_utils import deadline_meta

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


def countries_match(item_country: str, wanted: str) -> bool:
    """Loose match for scholarship `country` field vs extracted filter."""
    ic = _norm_country(item_country)
    w = _norm_country(wanted)
    if not w:
        return True
    if not ic:
        return False
    if ic == w:
        return True
    if w in ic or ic in w:
        return True
    return False


def filter_by_entities(candidates: List[Dict[str, Any]], filters: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Hard-filter when the user named a country and/or funding level.
    Without this, TF‑IDF similarity alone keeps irrelevant countries in the list.
    """
    out: List[Dict[str, Any]] = list(candidates)
    if filters.get("country"):
        out = [c for c in out if countries_match(str(c.get("country") or ""), str(filters["country"]))]
    if filters.get("funding_type") and filters.get("strict_funding"):
        wanted = str(filters["funding_type"]).lower()
        out = [c for c in out if wanted in str(c.get("funding_type") or "").lower()]
    return out


def _rule_score(item: Dict[str, Any], filters: Dict[str, Any]) -> float:
    score = 0.0
    if filters.get("country") and countries_match(str(item.get("country") or ""), str(filters["country"])):
        score += 0.4
    if filters.get("field") and str(filters["field"]).lower() in str(item.get("field") or "").lower():
        score += 0.4
    if filters.get("level") and str(filters["level"]).lower() in str(item.get("level") or "").lower():
        score += 0.2
    if filters.get("funding_type"):
        item_funding = str(item.get("funding_type") or "").lower()
        wanted_funding = str(filters["funding_type"]).lower()
        if wanted_funding in item_funding:
            score += 0.6
    boost = filters.get("profile_field_boost")
    if boost:
        blob = " ".join(
            [
                str(item.get("field") or ""),
                str(item.get("name") or ""),
                str(item.get("eligibility") or ""),
            ]
        ).lower()
        b = str(boost).lower()
        if b and (b in blob or any(len(t) > 3 and t in blob for t in b.replace(",", " ").split())):
            score += 0.3
    return score


def rank_results(candidates: List[Dict[str, Any]], filters: Dict[str, Any]) -> List[Dict[str, Any]]:
    working = candidates
    if filters.get("strict_funding") and filters.get("funding_type"):
        wanted = str(filters["funding_type"]).lower()
        strict = [c for c in candidates if wanted in str(c.get("funding_type") or "").lower()]
        if strict:
            working = strict

    ranked = []
    for c in working:
        facets = build_semantic_facets(c)
        vec = float(c.get("similarity") or 0.0)
        rules = _rule_score(c, filters)
        sem = semantic_alignment_score(filters, facets)
        combined = (0.55 * vec) + (0.30 * rules) + (0.15 * sem)
        row = dict(c)
        row["semantic"] = facets
        row["score"] = round(combined, 4)
        row.update(deadline_meta(row.get("deadline")))
        ranked.append(row)
    return sorted(ranked, key=lambda x: x.get("score", 0.0), reverse=True)

