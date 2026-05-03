from __future__ import annotations

from typing import Dict, Any

from app.utils.text_clean import clean_text


def check_eligibility(profile: Dict[str, Any], scholarship: Dict[str, Any]) -> Dict[str, Any]:
    reasons = []
    score = 0

    level = clean_text(str(profile.get("degreeLevel") or ""))
    field = clean_text(str(profile.get("fieldOfStudy") or ""))
    country = clean_text(str(profile.get("preferredCountry") or ""))
    gpa = profile.get("gpa")

    haystack = clean_text(
        " ".join(
            [
                str(scholarship.get("name") or ""),
                str(scholarship.get("field") or ""),
                str(scholarship.get("country") or ""),
                str(scholarship.get("eligibility") or ""),
            ]
        )
    )

    if level:
        if level in haystack:
            score += 1
            reasons.append(f"Degree level '{level}' matches.")
        else:
            reasons.append(f"Degree level '{level}' is not clearly mentioned in this scholarship.")
    else:
        reasons.append("Your degree level is missing from profile.")

    if field:
        if field in haystack:
            score += 1
            reasons.append(f"Field '{field}' matches.")
        else:
            reasons.append(f"Field '{field}' does not clearly match this scholarship.")
    else:
        reasons.append("Your field of study is missing from profile.")

    if country:
        if country in haystack:
            score += 1
            reasons.append(f"Preferred country '{country}' matches.")
        else:
            reasons.append(f"Preferred country '{country}' does not match this scholarship country.")
    else:
        reasons.append("Your preferred country is missing from profile.")

    if gpa is not None:
        score += 1
        reasons.append(f"GPA ({gpa}) was provided and considered.")
    else:
        reasons.append("GPA is missing from profile.")

    if score >= 3:
        status = "eligible"
    elif score == 2:
        status = "partially_eligible"
    else:
        status = "not_eligible"

    return {"status": status, "reasons": reasons}

