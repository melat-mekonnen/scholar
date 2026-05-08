from __future__ import annotations

from typing import List, Dict, Any

from app.utils.country_utils import countries_match, normalize_country
from app.utils.deadline_utils import deadline_meta
from app.utils.degree_utils import degrees_match
from app.utils.field_utils import fields_match, normalize_field


def _rule_score(item: Dict[str, Any], filters: Dict[str, Any]) -> float:
    score = 0.0
    if filters.get("country"):
        if countries_match(str(item.get("country") or ""), str(filters["country"])):
            score += 0.4
    if filters.get("field") and fields_match(str(filters["field"]), str(item.get("field") or "")):
        score += 0.4
    if filters.get("level") and degrees_match(str(filters["level"] or ""), str(item.get("level") or "")):
        score += 0.2
    if filters.get("funding_type"):
        item_funding = str(item.get("funding_type") or "").lower()
        wanted_funding = str(filters["funding_type"]).lower()
        if wanted_funding in item_funding:
            score += 0.6
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
        vec = float(c.get("similarity") or 0.0)
        rules = _rule_score(c, filters)
        combined = (0.65 * vec) + (0.35 * rules)
        row = dict(c)
        row["score"] = round(combined, 4)
        row.update(deadline_meta(row.get("deadline")))
        ranked.append(row)
    return sorted(ranked, key=lambda x: x.get("score", 0.0), reverse=True)

