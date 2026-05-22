"""
Milestone 2 — Merge DB JSONL export with curated trusted_sources.jsonl.

Reads:
  - data/knowledge_base.jsonl (from `python -m scripts.export_scholarships`) — optional if curated-only
  - curated/trusted_sources.jsonl — optional if DB file exists

Writes:
  - data/knowledge_base.merged.jsonl (default; see src/config.py MERGED_KNOWLEDGE_BASE_RELPATH)

Run from scholar-ml root:

  .venv\\Scripts\\python.exe -m scripts.merge_knowledge_base
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path
from urllib.parse import urlparse, urlunparse

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import os

os.chdir(ROOT)

from src.config import (
    CURATED_TRUSTED_SOURCES_RELPATH,
    MERGE_DEDUPE_CURATED_BY_URL_DEFAULT,
    MERGED_KNOWLEDGE_BASE_RELPATH,
)


def _norm_url(url: str | None) -> str | None:
    if not url or not isinstance(url, str):
        return None
    u = url.strip()
    if not u:
        return None
    try:
        p = urlparse(u)
        if not p.scheme:
            u = "https://" + u
            p = urlparse(u)
        path = (p.path or "").rstrip("/") or ""
        netloc = (p.netloc or "").lower()
        rebuilt = urlunparse((p.scheme.lower(), netloc, path, "", p.query or "", ""))
        return rebuilt.lower() if rebuilt else None
    except Exception:
        return u.lower().rstrip("/")


def _urls_from_db_record(rec: dict) -> set[str]:
    out: set[str] = set()
    for key in ("application_url", "source_url", "canonical_url"):
        n = _norm_url(rec.get(key))
        if n:
            out.add(n)
    return out


def _curated_scholarship_id(canonical_url: str) -> str:
    h = hashlib.sha256(canonical_url.strip().encode("utf-8")).hexdigest()[:16]
    return f"curated:{h}"


def _normalize_curated_row(raw: dict, line_no: int) -> dict:
    """Align curated JSONL with database export keys for downstream preprocess (M3)."""
    missing = [k for k in ("source_type", "canonical_url", "retrieved_at", "title") if not raw.get(k)]
    if missing:
        raise ValueError(f"line {line_no}: missing required keys: {missing}")

    st = str(raw["source_type"]).strip().lower()
    if st != "curated":
        raise ValueError(f"line {line_no}: source_type must be 'curated', got {raw['source_type']!r}")

    canonical = str(raw["canonical_url"]).strip()
    if not canonical:
        raise ValueError(f"line {line_no}: canonical_url is empty")

    desc = raw.get("description")
    if desc is None:
        desc = ""
    elif not isinstance(desc, str):
        desc = str(desc)

    app_url = raw.get("application_url")
    if app_url and str(app_url).strip():
        application_url = str(app_url).strip()
    else:
        application_url = canonical

    sid = _curated_scholarship_id(canonical)

    return {
        "source_type": "curated",
        "scholarship_id": sid,
        "title": str(raw["title"]).strip(),
        "organization_name": raw.get("organization_name"),
        "country": raw.get("country") or "",
        "deadline": raw.get("deadline"),
        "application_start_date": raw.get("application_start_date"),
        "application_end_date": raw.get("application_end_date"),
        "degree_level": raw.get("degree_level"),
        "status": "curated",
        "funding_type": raw.get("funding_type"),
        "field_of_study": raw.get("field_of_study"),
        "amount": raw.get("amount"),
        "description": desc,
        "application_url": application_url,
        "source_name": raw.get("source_name"),
        "source_url": canonical,
        "external_id": None,
        "is_recommended_default": bool(raw.get("is_recommended_default"))
        if raw.get("is_recommended_default") is not None
        else False,
        "created_at": None,
        "updated_at": None,
        "exported_at": None,
        "canonical_url": canonical,
        "retrieved_at": str(raw["retrieved_at"]).strip(),
    }


def _iter_jsonl(path: Path):
    with open(path, encoding="utf-8") as f:
        for i, line in enumerate(f, start=1):
            s = line.strip()
            if not s or s.startswith("#"):
                continue
            try:
                yield i, json.loads(s)
            except json.JSONDecodeError as e:
                raise ValueError(f"{path}: line {i}: invalid JSON: {e}") from e


def main() -> int:
    parser = argparse.ArgumentParser(description="Merge DB knowledge_base.jsonl with curated sources")
    parser.add_argument(
        "--db",
        type=Path,
        default=ROOT / "data" / "knowledge_base.jsonl",
        help="JSONL from export_scholarships (default: data/knowledge_base.jsonl)",
    )
    parser.add_argument(
        "--curated",
        type=Path,
        default=ROOT / CURATED_TRUSTED_SOURCES_RELPATH,
        help=f"Curated JSONL (default: {CURATED_TRUSTED_SOURCES_RELPATH})",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=ROOT / MERGED_KNOWLEDGE_BASE_RELPATH,
        help=f"Merged JSONL output (default: {MERGED_KNOWLEDGE_BASE_RELPATH})",
    )
    parser.add_argument(
        "--no-dedupe",
        action="store_true",
        help="Append all curated rows even when canonical_url matches a DB application_url/source_url",
    )
    args = parser.parse_args()

    db_path: Path = args.db
    curated_path: Path = args.curated
    output: Path = args.output
    dedupe = MERGE_DEDUPE_CURATED_BY_URL_DEFAULT and not args.no_dedupe

    db_exists = db_path.is_file()
    curated_exists = curated_path.is_file()

    if not db_exists and not curated_exists:
        print(
            f"ERROR: need at least one input. Missing both:\n  {db_path.resolve()}\n  {curated_path.resolve()}",
            file=sys.stderr,
        )
        return 1

    seen_urls: set[str] = set()
    db_count = 0
    curated_in = 0
    curated_out = 0
    skipped_dup = 0

    output.parent.mkdir(parents=True, exist_ok=True)

    try:
        with open(output, "w", encoding="utf-8") as out_f:
            if not db_exists and curated_exists:
                print(
                    f"WARN: DB file missing ({db_path}); writing curated-only merge → {output.resolve()}",
                    file=sys.stderr,
                )

            if db_exists:
                for line_no, rec in _iter_jsonl(db_path):
                    if not isinstance(rec, dict):
                        raise ValueError(f"{db_path}: line {line_no}: expected object, got {type(rec)}")
                    out_f.write(json.dumps(rec, ensure_ascii=False) + "\n")
                    db_count += 1
                    if dedupe:
                        seen_urls |= _urls_from_db_record(rec)

            if curated_exists:
                for line_no, raw in _iter_jsonl(curated_path):
                    if not isinstance(raw, dict):
                        raise ValueError(f"{curated_path}: line {line_no}: expected object, got {type(raw)}")
                    curated_in += 1
                    norm = _normalize_curated_row(raw, line_no)
                    c_url = _norm_url(norm["canonical_url"])
                    if dedupe and c_url and c_url in seen_urls:
                        skipped_dup += 1
                        continue
                    out_f.write(json.dumps(norm, ensure_ascii=False) + "\n")
                    curated_out += 1
                    if dedupe and c_url:
                        seen_urls.add(c_url)
                        n2 = _norm_url(norm.get("application_url"))
                        if n2:
                            seen_urls.add(n2)
            elif db_exists:
                print(
                    f"INFO: curated file not found ({curated_path}); merged output is DB-only.",
                    file=sys.stderr,
                )

    except ValueError as e:
        print(f"ERROR: {e}", file=sys.stderr)
        return 1

    parts = [f"db_rows={db_count}"]
    if curated_exists:
        parts.append(f"curated_lines={curated_in}")
        parts.append(f"curated_written={curated_out}")
        if skipped_dup:
            parts.append(f"curated_skipped_duplicate_url={skipped_dup}")
    print(f"OK: wrote {db_count + curated_out} lines to {output.resolve()} ({', '.join(parts)})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
