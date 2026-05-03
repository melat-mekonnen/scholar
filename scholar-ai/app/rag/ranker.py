from __future__ import annotations

from typing import List, Dict, Any

from app.utils.deadline_utils import deadline_meta


def _rule_score(item: Dict[str, Any], filters: Dict[str, Any]) -> float:
    score = 0.0
    if filters.get("country") and str(item.get("country") or "").lower() == str(filters["country"]).lower():
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

