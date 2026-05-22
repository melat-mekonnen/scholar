"""
Compare a student profile against scholarship metadata for eligibility hints.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any


@dataclass
class ProfileFieldMatch:
    profile_field: str
    profile_value: str | None
    scholarship_field: str
    scholarship_value: str | None
    status: str  # match, mismatch, partial, unknown
    detail: str


@dataclass
class ScholarshipEligibility:
    scholarship_id: str | None
    title: str | None
    overall: str  # likely_match, partial_match, likely_mismatch, needs_profile
    matches: list[ProfileFieldMatch]


def _norm(s: Any) -> str:
    if s is None:
        return ""
    return str(s).strip().casefold()


def _label_degree(level: str | None) -> str | None:
    if not level:
        return None
    labels = {
        "high_school": "High school",
        "bachelor": "Bachelor's",
        "master": "Master's",
        "phd": "PhD",
    }
    return labels.get(level, level.replace("_", " ").title())


DEGREE_ORDER = ("high_school", "bachelor", "master", "phd")


def _degree_index(level: str | None) -> int:
    if not level:
        return -1
    try:
        return DEGREE_ORDER.index(_norm(level))
    except ValueError:
        return -1


def _country_match(
    preferred: str | None,
    scholarship_country: str | None,
    *,
    program_named_in_query: bool = False,
) -> ProfileFieldMatch:
    p = preferred or ""
    s = scholarship_country or ""
    if not p:
        return ProfileFieldMatch(
            profile_field="preferred_country",
            profile_value=None,
            scholarship_field="country",
            scholarship_value=s or None,
            status="unknown",
            detail="Add your preferred study country in your profile.",
        )
    if not s:
        return ProfileFieldMatch(
            profile_field="preferred_country",
            profile_value=p,
            scholarship_field="country",
            scholarship_value=None,
            status="unknown",
            detail="Scholarship destination country is not listed in our index.",
        )
    pn, sn = _norm(p), _norm(s)
    if pn == sn or pn in sn or sn in pn:
        return ProfileFieldMatch(
            profile_field="preferred_country",
            profile_value=p,
            scholarship_field="country",
            scholarship_value=s,
            status="match",
            detail="Your preferred country aligns with this scholarship's destination.",
        )
    if program_named_in_query:
        return ProfileFieldMatch(
            profile_field="preferred_country",
            profile_value=p,
            scholarship_field="country",
            scholarship_value=s,
            status="partial",
            detail=(
                f"Your profile lists {p} as preferred, but you asked about a program in {s}. "
                "That can still be a good fit if you are open to studying there."
            ),
        )
    return ProfileFieldMatch(
        profile_field="preferred_country",
        profile_value=p,
        scholarship_field="country",
        scholarship_value=s,
        status="mismatch",
        detail="This scholarship is in a different country than your profile preference.",
    )


def _degree_match(profile_level: str | None, scholarship_level: str | None) -> ProfileFieldMatch:
    p = _label_degree(profile_level)
    s = _label_degree(scholarship_level)
    if not profile_level:
        return ProfileFieldMatch(
            profile_field="degree_level",
            profile_value=None,
            scholarship_field="degree_level",
            scholarship_value=s,
            status="unknown",
            detail="Add your current or highest degree level in your profile.",
        )
    if not scholarship_level:
        return ProfileFieldMatch(
            profile_field="degree_level",
            profile_value=p,
            scholarship_field="degree_level",
            scholarship_value=None,
            status="unknown",
            detail="Degree level is not specified for this scholarship in our index.",
        )

    pi = _degree_index(profile_level)
    si = _degree_index(scholarship_level)
    if pi == si:
        detail = "Your degree level matches what this scholarship supports."
        status = "match"
    elif pi + 1 == si:
        detail = (
            f"Your {p} profile fits a common path into this {s} program "
            "(next-step progression)."
        )
        status = "match"
    elif pi > si:
        detail = (
            f"You are already at {p}, while this scholarship targets {s} study. "
            "Verify whether that is still allowed on the official page."
        )
        status = "partial"
    else:
        detail = "Your profile degree level is below the level this scholarship targets."
        status = "mismatch"

    return ProfileFieldMatch(
        profile_field="degree_level",
        profile_value=p,
        scholarship_field="degree_level",
        scholarship_value=s,
        status=status,
        detail=detail,
    )


def _field_match(profile_field: str | None, scholarship_field: str | None) -> ProfileFieldMatch:
    p = profile_field or ""
    s = scholarship_field or ""
    if not p:
        return ProfileFieldMatch(
            profile_field="field_of_study",
            profile_value=None,
            scholarship_field="field_of_study",
            scholarship_value=s or None,
            status="unknown",
            detail="Add your field of study in your profile.",
        )
    if not s:
        return ProfileFieldMatch(
            profile_field="field_of_study",
            profile_value=p,
            scholarship_field="field_of_study",
            scholarship_value=None,
            status="unknown",
            detail="Field of study is not specified for this scholarship in our index.",
        )
    pn, sn = _norm(p), _norm(s)
    if "multi" in sn and "disciplin" in sn:
        return ProfileFieldMatch(
            profile_field="field_of_study",
            profile_value=p,
            scholarship_field="field_of_study",
            scholarship_value=s,
            status="match",
            detail="This scholarship accepts multiple disciplines, including your field.",
        )
    if pn == sn or pn in sn or sn in pn:
        return ProfileFieldMatch(
            profile_field="field_of_study",
            profile_value=p,
            scholarship_field="field_of_study",
            scholarship_value=s,
            status="match",
            detail="Your field of study aligns with this scholarship.",
        )
    return ProfileFieldMatch(
        profile_field="field_of_study",
        profile_value=p,
        scholarship_field="field_of_study",
        scholarship_value=s,
        status="partial",
        detail="Your field may still fit, but it is not an obvious match — verify on the official page.",
    )


def _interests_match(interests: list[str], scholarship: dict[str, Any]) -> ProfileFieldMatch:
    field = str(scholarship.get("field_of_study") or "")
    title = str(scholarship.get("title") or "")
    hay = _norm(f"{field} {title}")
    hits = [i for i in interests if _norm(i) and _norm(i) in hay]
    if not interests:
        return ProfileFieldMatch(
            profile_field="interests",
            profile_value=None,
            scholarship_field="field_of_study",
            scholarship_value=field or None,
            status="unknown",
            detail="Add interests in your profile to improve matching.",
        )
    if hits:
        return ProfileFieldMatch(
            profile_field="interests",
            profile_value=", ".join(interests),
            scholarship_field="field_of_study",
            scholarship_value=field or None,
            status="match",
            detail=f"Your interests overlap: {', '.join(hits)}.",
        )
    return ProfileFieldMatch(
        profile_field="interests",
        profile_value=", ".join(interests),
        scholarship_field="field_of_study",
        scholarship_value=field or None,
        status="partial",
        detail="None of your listed interests directly match this program's focus.",
    )


def _gpa_note(gpa: float | None) -> ProfileFieldMatch:
    if gpa is None:
        return ProfileFieldMatch(
            profile_field="gpa",
            profile_value=None,
            scholarship_field="gpa_requirement",
            scholarship_value=None,
            status="unknown",
            detail="Add your GPA in your profile. Minimum GPA is not structured in our index - check the official page.",
        )
    return ProfileFieldMatch(
        profile_field="gpa",
        profile_value=f"{gpa:.2f}",
        scholarship_field="gpa_requirement",
        scholarship_value=None,
        status="unknown",
        detail="Your GPA is on file, but minimum GPA rules are not structured in our index - verify on the official page.",
    )


def _overall_status(matches: list[ProfileFieldMatch]) -> str:
    statuses = {m.status for m in matches}
    if all(s == "unknown" for s in statuses):
        return "needs_profile"
    if "mismatch" in statuses:
        if any(s in {"match", "partial"} for s in statuses):
            return "partial_match"
        return "likely_mismatch"
    if "partial" in statuses:
        return "partial_match"
    if all(s in {"match", "unknown"} for s in statuses):
        return "likely_match"
    return "partial_match"


def assess_scholarship_eligibility(
    profile: dict[str, Any],
    scholarship: dict[str, Any],
    *,
    program_named_in_query: bool = False,
) -> ScholarshipEligibility:
    matches = [
        _degree_match(profile.get("degree_level"), scholarship.get("degree_level")),
        _country_match(
            profile.get("preferred_country"),
            scholarship.get("country"),
            program_named_in_query=program_named_in_query,
        ),
        _field_match(profile.get("field_of_study"), scholarship.get("field_of_study")),
        _interests_match(profile.get("interests") or [], scholarship),
        _gpa_note(profile.get("gpa")),
    ]
    return ScholarshipEligibility(
        scholarship_id=scholarship.get("scholarship_id"),
        title=scholarship.get("title"),
        overall=_overall_status(matches),
        matches=matches,
    )


def assess_eligibility_for_rows(
    profile: dict[str, Any],
    rows: list[dict[str, Any]],
    *,
    program_named_in_query: bool = False,
) -> list[ScholarshipEligibility]:
    if not rows:
        return []
    seen: set[str] = set()
    out: list[ScholarshipEligibility] = []
    for row in rows:
        sid = str(row.get("scholarship_id") or row.get("title") or "")
        if sid in seen:
            continue
        seen.add(sid)
        out.append(
            assess_scholarship_eligibility(
                profile,
                row,
                program_named_in_query=program_named_in_query,
            )
        )
    return out


def eligibility_to_dict(items: list[ScholarshipEligibility]) -> list[dict[str, Any]]:
    return [
        {
            "scholarship_id": e.scholarship_id,
            "title": e.title,
            "overall": e.overall,
            "matches": [asdict(m) for m in e.matches],
        }
        for e in items
    ]


def format_eligibility_for_prompt(items: list[ScholarshipEligibility]) -> str:
    if not items:
        return "[none]"
    blocks: list[str] = []
    for e in items:
        lines = [f"Program: {e.title or 'Unknown'} (overall={e.overall})"]
        for m in e.matches:
            lines.append(
                f"- {m.profile_field}={m.profile_value or 'not set'} vs "
                f"{m.scholarship_field}={m.scholarship_value or 'n/a'} → {m.status}: {m.detail}"
            )
        blocks.append("\n".join(lines))
    return "\n\n".join(blocks)
