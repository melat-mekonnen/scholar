from __future__ import annotations

from typing import Dict, Any

from app.utils.country_utils import countries_match, normalize_country
from app.utils.degree_utils import degrees_match, normalize_degree
from app.utils.field_utils import fields_match, get_match_level, normalize_field
from app.utils.text_clean import clean_text


def check_eligibility(profile: Dict[str, Any], scholarship: Dict[str, Any]) -> Dict[str, Any]:
    reasons = []
    score = 0.0

    level = normalize_degree(str(profile.get("degreeLevel") or ""))
    field = normalize_field(str(profile.get("fieldOfStudy") or ""))
    preferred_country = normalize_country(str(profile.get("preferredCountry") or ""))
    scholarship_country = normalize_country(str(scholarship.get("country") or ""))
    scholarship_field = normalize_field(str(scholarship.get("field") or ""))
    scholarship_level = normalize_degree(str(scholarship.get("level") or ""))
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
        if degrees_match(level, scholarship_level):
            score += 1
            level_label = "master's" if scholarship_level == "masters" else scholarship_level
            reasons.append(
                f"The scholarship supports {level_label} level study, which matches your selected degree level."
            )
        else:
            user_label = "master's" if level == "masters" else level
            reasons.append(
                f"The scholarship does not clearly support {user_label} level study."
            )
    else:
        reasons.append("Your degree level is missing from profile.")

    if field:
        match_level = get_match_level(field, scholarship_field)
        if match_level in ("exact_match", "strong_related_match"):
            score += 1
            reasons.append(f"Your {field.title()} background is strongly related to {scholarship_field.title()} programs supported by this scholarship.")
        elif match_level == "partial_related_match":
            score += 0.5  # partial score
            reasons.append(f"Your {field.title()} background has some relation to {scholarship_field.title()}.")
        else:
            reasons.append(f"Your {field.title()} background does not clearly relate to {scholarship_field.title()}.")
    else:
        reasons.append("Your field of study is missing from profile.")

    if preferred_country:
        if countries_match(preferred_country, scholarship_country):
            score += 1
            reasons.append(
                f"The scholarship is offered in the {scholarship_country.title()}, which matches your preferred country selection."
            )
        else:
            reasons.append(
                f"The scholarship is offered in {scholarship_country.title()}, which does not match your preferred country selection."
            )
    else:
        reasons.append("Your preferred country is missing from profile.")

    if gpa is not None:
        score += 1
        reasons.append(f"GPA ({gpa}) was provided and considered.")
    else:
        reasons.append("GPA is missing from profile.")

    if score >= 3.0:
        status = "Fully Eligible"
        natural = f"You are fully eligible for the {scholarship.get('name', 'scholarship')}. Your degree level, field of study, preferred country, and GPA all align well with the requirements."
    elif score >= 2.0:
        status = "Partially Eligible"
        natural = f"You are partially eligible for the {scholarship.get('name', 'scholarship')}. While some aspects like your GPA and degree level match, there might be considerations with the field or country preferences."
    else:
        status = "Not Eligible"
        natural = f"You may not be eligible for the {scholarship.get('name', 'scholarship')} due to mismatches in degree level, field, or country. Consider exploring other opportunities that better match your profile."

    return {"status": status, "reasons": reasons}

