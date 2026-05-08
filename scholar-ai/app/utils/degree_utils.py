from __future__ import annotations

import re

from app.utils.text_clean import clean_text

DEGREE_ALIASES: dict[str, str] = {
    "master": "masters",
    "masters": "masters",
    "master s": "masters",
    "master degree": "masters",
    "masters degree": "masters",
    "master s degree": "masters",
    "master's": "masters",
    "master's degree": "masters",
    "master of science": "masters",
    "master of arts": "masters",
    "bachelor": "bachelors",
    "bachelors": "bachelors",
    "bachelor s": "bachelors",
    "bachelor degree": "bachelors",
    "bachelor's": "bachelors",
    "bachelor's degree": "bachelors",
    "undergraduate": "bachelors",
    "phd": "phd",
    "doctorate": "phd",
    "doctoral": "phd",
    "doctor of philosophy": "phd",
}


def normalize_degree(degree: str) -> str:
    normalized = clean_text(degree or "")
    normalized = re.sub(r"[^a-z0-9\s]", " ", normalized)
    normalized = re.sub(r"\s+", " ", normalized).strip()
    if not normalized:
        return ""
    return DEGREE_ALIASES.get(normalized, normalized)


def degrees_match(degree_a: str, degree_b: str) -> bool:
    return bool(normalize_degree(degree_a) and normalize_degree(degree_b) and normalize_degree(degree_a) == normalize_degree(degree_b))
