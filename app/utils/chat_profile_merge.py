from __future__ import annotations

from typing import Any, Dict, Optional

from app.api.chat_schemas import ChatProfile


def merge_profile_into_entities(entities: Dict[str, Any], profile: Optional[ChatProfile]) -> Dict[str, Any]:
    """
    Fill gaps from the student profile for ranking hints (level, field boost).
    Preferred country is NOT merged into hard filters — it broke named-program
    questions (e.g. DAAD) when the profile listed a different country.
    """
    out = dict(entities)
    if profile is None:
        return out

    # Do NOT merge preferredCountry into hard filters: users often ask about a named
    # program (DAAD, Chevening) while their profile still says another country — that
    # would incorrectly filter the whole answer to the profile country.

    if not out.get("level") and profile.degreeLevel:
        lv = str(profile.degreeLevel).strip().lower()
        if "phd" in lv or "doctor" in lv:
            out["level"] = "phd"
        elif "master" in lv or "msc" in lv or "postgraduate" in lv:
            out["level"] = "master"
        elif "bachelor" in lv or "undergrad" in lv:
            out["level"] = "bachelor"
        else:
            out["level"] = lv

    if not out.get("field") and profile.fieldOfStudy:
        fs = str(profile.fieldOfStudy).strip().lower()
        if fs:
            out["profile_field_boost"] = fs

    return out


def build_retrieval_query(message: str, profile: Optional[ChatProfile]) -> str:
    """Enrich retrieval (not entity extraction) with profile terms for better recall."""
    parts = [message.strip()]
    if profile:
        if profile.fieldOfStudy:
            parts.append(str(profile.fieldOfStudy))
        if profile.interests:
            parts.extend(str(x) for x in profile.interests if x)
        if profile.preferredCountry:
            parts.append(str(profile.preferredCountry))
        if profile.degreeLevel:
            parts.append(str(profile.degreeLevel))
    return " ".join(p for p in parts if p).strip()
