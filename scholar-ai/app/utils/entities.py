from __future__ import annotations

import re
from typing import Dict, Any

from app.utils.text_clean import clean_text


DEGREE_PATTERNS = {
    "phd": r"\b(phd|doctorate|doctoral)\b",
    "master": r"\b(master|masters|msc|ma|postgraduate)\b",
    "bachelor": r"\b(bachelor|bachelors|undergraduate)\b",
}

# Longest phrases first so "united states" wins over "states" if we ever add it.
_COUNTRY_PHRASES = (
    "united kingdom",
    "united states",
    "new zealand",
    "south korea",
    "south africa",
    "saudi arabia",
    "costa rica",
    "germany",
    "france",
    "japan",
    "australia",
    "canada",
    "netherlands",
    "holland",
    "switzerland",
    "italy",
    "spain",
    "sweden",
    "norway",
    "denmark",
    "finland",
    "belgium",
    "austria",
    "ireland",
    "portugal",
    "poland",
    "china",
    "india",
    "brazil",
    "mexico",
    "ethiopia",
    "nigeria",
    "kenya",
    "egypt",
    "europe",
    "asia",
)

_COUNTRY_ALIASES = {
    "uk": "united kingdom",
    "u k": "united kingdom",
    "usa": "united states",
    "u s": "united states",
    "us": "united states",
    "the netherlands": "netherlands",
}

# Words that match "prep + word" country heuristics but are NOT countries
# (e.g. "eligible for DAAD" must not set country=daad).
_COUNTRY_FALSE_POSITIVES = frozenset(
    {
        "daad",
        "chevening",
        "fulbright",
        "erasmus",
        "mext",
        "master",
        "masters",
        "phd",
        "bachelor",
        "degree",
        "student",
        "students",
        "scholarship",
        "scholarships",
        "application",
        "applications",
        "deadline",
        "deadlines",
        "you",
        "your",
        "the",
        "this",
        "that",
        "these",
        "those",
        "all",
        "any",
        "some",
        "more",
        "each",
        "every",
        "both",
        "other",
        "others",
        "many",
        "few",
        "such",
        "same",
        "international",
        "funding",
        "eligibility",
        "eligible",
    }
)

_SINGLE_TOKEN_COUNTRIES = frozenset(p for p in _COUNTRY_PHRASES if " " not in p) | frozenset(_COUNTRY_ALIASES.keys())


def extract_entities(message: str) -> Dict[str, Any]:
    text = clean_text(message)
    out: Dict[str, Any] = {
        "country": None,
        "field": None,
        "level": None,
        "funding_type": None,
        "strict_funding": False,
    }

    for phrase in _COUNTRY_PHRASES:
        if phrase in text:
            out["country"] = phrase
            break
    if not out["country"]:
        # Prefer "in/at/from + place" (geographic). Avoid bare "for + X" catching "for DAAD".
        country_match = re.search(r"\b(in|at|from)\s+(?:the\s+)?([a-z]{3,})\b", text)
        if country_match:
            raw = country_match.group(2).strip()
            if raw not in _COUNTRY_FALSE_POSITIVES:
                out["country"] = _COUNTRY_ALIASES.get(raw, raw)
    if not out["country"]:
        # "for Germany" / "for the uk" — only when the token is a known country.
        for_m = re.search(r"\bfor\s+(?:the\s+)?([a-z]{2,})\b", text)
        if for_m:
            raw = for_m.group(1).strip()
            if raw in _SINGLE_TOKEN_COUNTRIES and raw not in _COUNTRY_FALSE_POSITIVES:
                out["country"] = _COUNTRY_ALIASES.get(raw, raw)

    field_match = re.search(r"\b(ai|computer science|engineering|medicine|business|law|data science)\b", text)
    if field_match:
        out["field"] = field_match.group(1).strip()

    for level, pattern in DEGREE_PATTERNS.items():
        if re.search(pattern, text):
            out["level"] = level
            break

    if re.search(r"\bfully funded\b", text) or re.search(r"\bfull funding\b", text):
        out["funding_type"] = "fully funded"
        out["strict_funding"] = True
    elif re.search(r"\b(partially funded|partial funding)\b", text) or (
        re.search(r"\bpartially\b", text) and re.search(r"\bfund", text)
    ):
        out["funding_type"] = "partially funded"
        out["strict_funding"] = True
    elif re.search(r"\b(self funded|self-funding|self funding)\b", text):
        out["funding_type"] = "self funded"
        out["strict_funding"] = True

    if out["funding_type"] and re.search(r"\b(only|just|strictly)\b", text):
        out["strict_funding"] = True

    return out

