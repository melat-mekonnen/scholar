from __future__ import annotations

import re

from app.utils.text_clean import clean_text

COUNTRY_ALIASES: dict[str, str] = {
    "usa": "united states",
    "u s a": "united states",
    "u s": "united states",
    "us": "united states",
    "u.s.a": "united states",
    "u.s.": "united states",
    "united states of america": "united states",
    "united state": "united states",
    "the united states": "united states",
    "uk": "united kingdom",
    "u k": "united kingdom",
    "u.k.": "united kingdom",
    "the uk": "united kingdom",
    "uae": "united arab emirates",
    "u a e": "united arab emirates",
    "u.a.e.": "united arab emirates",
    "the uae": "united arab emirates",
    "united arab emirates": "united arab emirates",
}


def normalize_country(country: str) -> str:
    normalized = clean_text(country or "")
    normalized = re.sub(r"\b(the|republic|state|of)\b", " ", normalized)
    normalized = re.sub(r"[^a-z0-9\s]", " ", normalized)
    normalized = re.sub(r"\s+", " ", normalized).strip()
    if not normalized:
        return ""
    return COUNTRY_ALIASES.get(normalized, normalized)


def countries_match(country_a: str, country_b: str) -> bool:
    if not country_a or not country_b:
        return False
    return normalize_country(country_a) == normalize_country(country_b)
