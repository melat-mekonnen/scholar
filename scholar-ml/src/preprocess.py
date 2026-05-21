"""
Milestone 3 helpers: clean and normalize scholarship JSONL records.
"""
from __future__ import annotations

import json
import re
from typing import Any
from urllib.parse import urlparse, urlunparse

from bs4 import BeautifulSoup

_SPACE_RE = re.compile(r"\s+")


def normalize_whitespace(value: Any) -> str:
    if value is None:
        return ""
    text = value if isinstance(value, str) else str(value)
    return _SPACE_RE.sub(" ", text).strip()


def strip_html(text: str) -> str:
    if not text:
        return ""
    soup = BeautifulSoup(text, "html.parser")
    return soup.get_text(separator=" ", strip=True)


def normalize_text(value: Any, lowercase: bool = False) -> str:
    text = strip_html(normalize_whitespace(value))
    return text.lower() if lowercase else text


def normalize_url(url: Any) -> str:
    if url is None:
        return ""
    raw = normalize_whitespace(url)
    if not raw:
        return ""
    try:
        parsed = urlparse(raw if "://" in raw else f"https://{raw}")
        scheme = (parsed.scheme or "https").lower()
        netloc = (parsed.netloc or "").lower()
        path = (parsed.path or "").rstrip("/")
        normalized = urlunparse((scheme, netloc, path, "", parsed.query or "", ""))
        return normalized
    except Exception:
        return raw.rstrip("/")


def dedupe_key(record: dict[str, Any]) -> str:
    app_url = normalize_url(record.get("application_url"))
    source_url = normalize_url(record.get("source_url"))
    canonical = normalize_url(record.get("canonical_url"))
    scholarship_id = normalize_whitespace(record.get("scholarship_id"))
    title = normalize_whitespace(record.get("title"))
    country = normalize_whitespace(record.get("country"))

    url_key = app_url or source_url or canonical
    if url_key:
        return f"url:{url_key}"
    if scholarship_id:
        return f"id:{scholarship_id}"
    return f"title-country:{title.lower()}::{country.lower()}"


def normalize_record(record: dict[str, Any], lowercase_text: bool = False) -> dict[str, Any]:
    clean = dict(record)

    clean["title"] = normalize_text(clean.get("title"), lowercase=lowercase_text)
    clean["description"] = normalize_text(clean.get("description"), lowercase=lowercase_text)
    clean["organization_name"] = normalize_text(clean.get("organization_name"), lowercase=lowercase_text)
    clean["country"] = normalize_whitespace(clean.get("country"))
    clean["degree_level"] = normalize_whitespace(clean.get("degree_level"))
    clean["field_of_study"] = normalize_whitespace(clean.get("field_of_study"))
    clean["funding_type"] = normalize_whitespace(clean.get("funding_type"))
    clean["amount"] = normalize_whitespace(clean.get("amount"))
    clean["source_name"] = normalize_whitespace(clean.get("source_name"))
    clean["status"] = normalize_whitespace(clean.get("status"))
    clean["scholarship_id"] = normalize_whitespace(clean.get("scholarship_id"))

    clean["application_url"] = normalize_url(clean.get("application_url"))
    clean["source_url"] = normalize_url(clean.get("source_url"))
    canonical = normalize_url(clean.get("canonical_url"))
    if canonical:
        clean["canonical_url"] = canonical

    if not clean["description"]:
        clean["description"] = "No description provided."

    return clean


def load_jsonl(path: str) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    with open(path, "r", encoding="utf-8-sig") as f:
        for idx, line in enumerate(f, start=1):
            item = line.strip()
            if not item or item.startswith("#"):
                continue
            try:
                row = json.loads(item)
            except json.JSONDecodeError as e:
                raise ValueError(f"{path}: line {idx}: invalid JSON: {e}") from e
            if not isinstance(row, dict):
                raise ValueError(f"{path}: line {idx}: expected object, got {type(row)}")
            rows.append(row)
    return rows
