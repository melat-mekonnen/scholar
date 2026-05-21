"""
Load student profile from EthioScholar Postgres (student_profiles table).
"""
from __future__ import annotations

from typing import Any

from src.db import connect


def fetch_student_profile(user_id: str) -> dict[str, Any] | None:
    """Return profile dict or None if the user has no student_profiles row."""
    uid = str(user_id).strip()
    if not uid:
        return None

    sql = """
    SELECT
      user_id,
      field_of_study,
      gpa,
      degree_level,
      preferred_country,
      interests,
      completeness_score
    FROM student_profiles
    WHERE user_id = %s::uuid
    LIMIT 1
    """
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (uid,))
            row = cur.fetchone()
    if not row:
        return None

    interests = row.get("interests") or []
    if not isinstance(interests, list):
        interests = list(interests)

    gpa = row.get("gpa")
    return {
        "user_id": str(row.get("user_id") or uid),
        "field_of_study": _text(row.get("field_of_study")),
        "gpa": float(gpa) if gpa is not None else None,
        "degree_level": _text(row.get("degree_level")),
        "preferred_country": _text(row.get("preferred_country")),
        "interests": [_text(i) for i in interests if _text(i)],
        "completeness_score": int(row.get("completeness_score") or 0),
    }


def _text(v: Any) -> str | None:
    if v is None:
        return None
    s = str(v).strip()
    return s or None
