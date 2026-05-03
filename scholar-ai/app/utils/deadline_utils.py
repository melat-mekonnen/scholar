from __future__ import annotations

from datetime import date
from typing import Dict, Any, Optional


def parse_iso_date(value: Optional[str]) -> Optional[date]:
    if not value:
        return None
    try:
        return date.fromisoformat(str(value)[:10])
    except ValueError:
        return None


def deadline_meta(deadline_value: Optional[str]) -> Dict[str, Any]:
    d = parse_iso_date(deadline_value)
    if not d:
        return {"daysLeft": None, "urgency": "unknown"}
    days_left = (d - date.today()).days
    if days_left < 0:
        urgency = "expired"
    elif days_left <= 14:
        urgency = "urgent"
    elif days_left <= 45:
        urgency = "soon"
    else:
        urgency = "later"
    return {"daysLeft": days_left, "urgency": urgency}

