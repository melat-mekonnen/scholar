from __future__ import annotations

import re
from typing import Dict, List

from app.utils.text_clean import clean_text

FIELD_RELATIONS: Dict[str, List[str]] = {
    "computer science": [
        "engineering",
        "software engineering",
        "artificial intelligence",
        "ai",
        "data science",
        "information technology",
        "it",
        "machine learning",
        "cybersecurity",
        "informatics",
        "computer engineering",
    ],
    "engineering": [
        "computer science",
        "software engineering",
        "mechanical engineering",
        "electrical engineering",
        "civil engineering",
        "chemical engineering",
        "biomedical engineering",
        "aerospace engineering",
        "computer engineering",
    ],
    "artificial intelligence": [
        "ai",
        "computer science",
        "data science",
        "machine learning",
        "robotics",
        "cognitive science",
    ],
    "data science": [
        "computer science",
        "statistics",
        "machine learning",
        "artificial intelligence",
        "big data",
        "analytics",
    ],
    "information technology": [
        "it",
        "computer science",
        "software engineering",
        "cybersecurity",
        "networking",
    ],
    "software engineering": [
        "computer science",
        "engineering",
        "programming",
        "development",
    ],
    "machine learning": [
        "artificial intelligence",
        "data science",
        "computer science",
        "statistics",
    ],
    "cybersecurity": [
        "information technology",
        "computer science",
        "security",
        "networking",
    ],
    "business": [
        "management",
        "finance",
        "marketing",
        "entrepreneurship",
        "economics",
    ],
    "medicine": [
        "health sciences",
        "biology",
        "pharmacy",
        "nursing",
        "biomedical",
    ],
    "law": [
        "legal studies",
        "jurisprudence",
        "international law",
    ],
    "public policy": [
        "political science",
        "government",
        "international relations",
    ],
}


def normalize_field(field: str) -> str:
    normalized = clean_text(field or "")
    normalized = re.sub(r"\b(and|or|with|in|for|of)\b", " ", normalized)
    normalized = re.sub(r"[^a-z0-9\s]", " ", normalized)
    normalized = re.sub(r"\s+", " ", normalized).strip()
    return normalized


def get_match_level(user_field: str, scholarship_field: str) -> str:
    user_norm = normalize_field(user_field)
    scholarship_norm = normalize_field(scholarship_field)

    if not user_norm or not scholarship_norm:
        return "no_match"

    if user_norm == scholarship_norm:
        return "exact_match"

    # Check direct relations
    user_related = FIELD_RELATIONS.get(user_norm, [])
    if scholarship_norm in user_related:
        return "strong_related_match"

    scholarship_related = FIELD_RELATIONS.get(scholarship_norm, [])
    if user_norm in scholarship_related:
        return "strong_related_match"

    # Check keyword overlap
    user_words = set(user_norm.split())
    scholarship_words = set(scholarship_norm.split())
    overlap = user_words & scholarship_words
    if overlap:
        if len(overlap) >= 2 or (len(user_words) <= 2 and len(scholarship_words) <= 2):
            return "partial_related_match"
        else:
            return "weak_match"

    # Fuzzy check for common terms
    common_terms = {"science", "engineering", "technology", "studies", "research"}
    if any(term in user_norm for term in common_terms) and any(term in scholarship_norm for term in common_terms):
        return "weak_match"

    return "no_match"


def fields_match(user_field: str, scholarship_field: str) -> bool:
    level = get_match_level(user_field, scholarship_field)
    return level in ("exact_match", "strong_related_match", "partial_related_match")