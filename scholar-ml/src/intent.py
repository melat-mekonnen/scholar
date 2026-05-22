"""
Intent routing: general vs scholarship vs mixed queries.
"""
from __future__ import annotations

import re
from enum import Enum


class ChatMode(str, Enum):
    GENERAL = "general"
    SCHOLARSHIP = "scholarship"
    MIXED = "mixed"


_GREETING_RE = re.compile(
    r"^(hi|hello|hey|good morning|good afternoon|good evening|thanks|thank you|"
    r"how are you|what'?s up|yo)[!.?\s]*$",
    re.IGNORECASE,
)

_SCHOLARSHIP_KEYWORDS = (
    "scholarship",
    "scholarships",
    "grant",
    "grants",
    "funding",
    "funded",
    "tuition",
    "deadline",
    "apply",
    "application",
    "eligibility",
    "chevening",
    "fulbright",
    "daad",
    "masters",
    "master",
    "phd",
    "bachelor",
    "degree",
    "stipend",
    "fellowship",
    "award",
)

_GENERAL_CUES = (
    "nervous",
    "stressed",
    "worried",
    "anxious",
    "help me",
    "how do i",
    "how can i",
    "what should i",
    "advice",
    "motivation letter",
    "cv",
    "resume",
    "personal statement",
    "interview",
    "feel",
    "scared",
)


def is_pure_greeting(message: str) -> bool:
    text = message.strip()
    if not text:
        return False
    if _GREETING_RE.match(text):
        return True
    return len(text.split()) <= 3 and text.lower() in {
        "hi",
        "hello",
        "hey",
        "thanks",
        "thank you",
        "good morning",
        "good afternoon",
        "good evening",
    }


def _keyword_hits(message: str, keywords: tuple[str, ...]) -> int:
    lower = message.lower()
    return sum(1 for kw in keywords if kw in lower)


def classify_intent(message: str, *, has_filters: bool = False) -> ChatMode:
    """
    Route user message before RAG.
    Explicit filters always use scholarship retrieval path.
    """
    if has_filters:
        return ChatMode.SCHOLARSHIP

    text = message.strip()
    if not text:
        return ChatMode.GENERAL

    if is_pure_greeting(text):
        return ChatMode.GENERAL

    sch_hits = _keyword_hits(text, _SCHOLARSHIP_KEYWORDS)
    general_hits = _keyword_hits(text, _GENERAL_CUES)

    if sch_hits >= 1 and general_hits >= 1:
        return ChatMode.MIXED
    if sch_hits >= 1:
        return ChatMode.SCHOLARSHIP
    return ChatMode.GENERAL
