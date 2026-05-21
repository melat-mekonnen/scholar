"""
Milestone 4 helpers: split cleaned scholarship rows into retrieval chunks.
"""
from __future__ import annotations

from typing import Any

from src.preprocess import normalize_whitespace


def chunk_text(text: str, target_chars: int, overlap_chars: int) -> list[str]:
    normalized = normalize_whitespace(text)
    if not normalized:
        return []
    if target_chars <= 0:
        raise ValueError("target_chars must be > 0")
    if overlap_chars < 0:
        raise ValueError("overlap_chars must be >= 0")
    if overlap_chars >= target_chars:
        raise ValueError("overlap_chars must be less than target_chars")

    chunks: list[str] = []
    start = 0
    length = len(normalized)
    while start < length:
        end = min(start + target_chars, length)
        if end < length:
            # Avoid hard-cutting in the middle of words when possible.
            split_at = normalized.rfind(" ", start, end)
            if split_at > start + int(target_chars * 0.6):
                end = split_at
        piece = normalized[start:end].strip()
        if piece:
            chunks.append(piece)
        if end >= length:
            break
        next_start = max(end - overlap_chars, start + 1)
        # Prefer starting new chunks at word boundaries.
        while next_start > start + 1 and normalized[next_start - 1] != " ":
            next_start -= 1
        if next_start < length and normalized[next_start] == " ":
            next_start += 1
        start = min(next_start, length)
    return chunks


def base_url_for_record(record: dict[str, Any]) -> str:
    for key in ("application_url", "source_url", "canonical_url"):
        value = normalize_whitespace(record.get(key))
        if value:
            return value
    return ""


def record_to_chunks(
    record: dict[str, Any],
    target_chars: int,
    overlap_chars: int,
) -> list[dict[str, Any]]:
    description = normalize_whitespace(record.get("description"))
    title = normalize_whitespace(record.get("title"))
    body = description if description else title
    if not body:
        return []

    text_chunks = chunk_text(body, target_chars=target_chars, overlap_chars=overlap_chars)
    scholarship_id = normalize_whitespace(record.get("scholarship_id"))
    source_type = normalize_whitespace(record.get("source_type"))

    out: list[dict[str, Any]] = []
    url = base_url_for_record(record)
    for idx, chunk in enumerate(text_chunks):
        out.append(
            {
                "chunk_id": f"{scholarship_id}::chunk_{idx}",
                "scholarship_id": scholarship_id,
                "chunk_index": idx,
                "chunk_text": chunk,
                "title": title,
                "url": url,
                "source_type": source_type,
                "country": normalize_whitespace(record.get("country")),
                "degree_level": normalize_whitespace(record.get("degree_level")),
                "field_of_study": normalize_whitespace(record.get("field_of_study")),
                "funding_type": normalize_whitespace(record.get("funding_type")),
                "deadline": record.get("deadline"),
                "status": normalize_whitespace(record.get("status")),
            }
        )
    return out
