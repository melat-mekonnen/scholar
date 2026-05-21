"""
Milestone 3 — Clean merged scholarship JSONL.

Reads:
  - data/knowledge_base.merged.jsonl

Writes:
  - data/knowledge_base.clean.jsonl
  - data/knowledge_base.clean.stats.json

Run from scholar-ml root:
  .venv\\Scripts\\python.exe -m scripts.preprocess_knowledge_base
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import os

os.chdir(ROOT)

from src.config import (
    PREPROCESS_INPUT_RELPATH,
    PREPROCESS_LOWERCASE_TEXT,
    PREPROCESS_OUTPUT_RELPATH,
    PREPROCESS_STATS_RELPATH,
)
from src.preprocess import dedupe_key, load_jsonl, normalize_record


def _schema_errors(rec: dict, idx: int) -> list[str]:
    errs: list[str] = []
    required = ("title", "description", "scholarship_id")
    for key in required:
        if key not in rec or not isinstance(rec[key], str) or not rec[key].strip():
            errs.append(f"line {idx}: missing/empty required string '{key}'")
    if "application_url" in rec and rec["application_url"] and not isinstance(rec["application_url"], str):
        errs.append(f"line {idx}: application_url must be string when present")
    if "source_url" in rec and rec["source_url"] and not isinstance(rec["source_url"], str):
        errs.append(f"line {idx}: source_url must be string when present")
    return errs


def main() -> int:
    parser = argparse.ArgumentParser(description="Preprocess merged scholarship JSONL")
    parser.add_argument("--input", type=Path, default=ROOT / PREPROCESS_INPUT_RELPATH)
    parser.add_argument("--output", type=Path, default=ROOT / PREPROCESS_OUTPUT_RELPATH)
    parser.add_argument("--stats", type=Path, default=ROOT / PREPROCESS_STATS_RELPATH)
    parser.add_argument(
        "--lowercase-text",
        action="store_true",
        help="Lowercase title/description/organization_name during normalization",
    )
    args = parser.parse_args()

    input_path = args.input
    output_path = args.output
    stats_path = args.stats
    lowercase_text = PREPROCESS_LOWERCASE_TEXT or args.lowercase_text

    if not input_path.is_file():
        print(f"ERROR: input file not found: {input_path.resolve()}", file=sys.stderr)
        return 1

    try:
        raw_rows = load_jsonl(str(input_path))
    except ValueError as e:
        print(f"ERROR: {e}", file=sys.stderr)
        return 1

    total_in = len(raw_rows)
    dropped_duplicates = 0
    dropped_invalid = 0
    seen: set[str] = set()
    cleaned: list[dict] = []
    validation_errors: list[str] = []

    for idx, raw in enumerate(raw_rows, start=1):
        rec = normalize_record(raw, lowercase_text=lowercase_text)
        key = dedupe_key(rec)
        if key in seen:
            dropped_duplicates += 1
            continue
        seen.add(key)

        errs = _schema_errors(rec, idx)
        if errs:
            dropped_invalid += 1
            validation_errors.extend(errs)
            continue
        cleaned.append(rec)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    stats_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, "w", encoding="utf-8") as out_f:
        for rec in cleaned:
            out_f.write(json.dumps(rec, ensure_ascii=False) + "\n")

    stats = {
        "input_path": str(input_path.resolve()),
        "output_path": str(output_path.resolve()),
        "stats_path": str(stats_path.resolve()),
        "total_input_rows": total_in,
        "output_rows": len(cleaned),
        "dropped_duplicates": dropped_duplicates,
        "dropped_invalid": dropped_invalid,
        "lowercase_text": bool(lowercase_text),
        "validation_errors": validation_errors[:100],
    }
    with open(stats_path, "w", encoding="utf-8") as f:
        json.dump(stats, f, indent=2, ensure_ascii=False)

    print(
        "OK: wrote "
        f"{len(cleaned)} clean rows to {output_path.resolve()} "
        f"(input={total_in}, dup_dropped={dropped_duplicates}, invalid_dropped={dropped_invalid})"
    )
    print(f"OK: wrote stats to {stats_path.resolve()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
