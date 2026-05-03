from __future__ import annotations

import re
from typing import Dict, Any

from app.utils.text_clean import clean_text


DEGREE_PATTERNS = {
    "phd": r"\b(phd|doctorate|doctoral)\b",
    "master": r"\b(master|masters|msc|ma|postgraduate)\b",
    "bachelor": r"\b(bachelor|bachelors|undergraduate)\b",
}


def extract_entities(message: str) -> Dict[str, Any]:
    text = clean_text(message)
    out: Dict[str, Any] = {
        "country": None,
        "field": None,
        "level": None,
        "funding_type": None,
        "strict_funding": False,
    }

    country_match = re.search(r"\b(in|for|at)\s+([a-z]{3,})\b", text)
    if country_match:
        out["country"] = country_match.group(2).strip()

    field_match = re.search(r"\b(ai|computer science|engineering|medicine|business|law|data science)\b", text)
    if field_match:
        out["field"] = field_match.group(1).strip()

    for level, pattern in DEGREE_PATTERNS.items():
        if re.search(pattern, text):
            out["level"] = level
            break

    if re.search(r"\bfully funded\b", text):
        out["funding_type"] = "fully funded"
    elif re.search(r"\b(partially funded|partial funding|partially)\b", text):
        out["funding_type"] = "partially funded"
    elif re.search(r"\b(self funded|self-funding|self funding)\b", text):
        out["funding_type"] = "self funded"

    if out["funding_type"] and re.search(r"\b(only|just|strictly)\b", text):
        out["strict_funding"] = True

    return out

