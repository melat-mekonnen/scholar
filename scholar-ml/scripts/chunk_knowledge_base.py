"""
Milestone 4 — Chunk cleaned scholarship JSONL into retrieval-ready rows.

Reads:
  - data/knowledge_base.clean.jsonl

Writes:
  - data/chunks.jsonl
  - data/chunks.stats.json

Run from scholar-ml root:
  .venv\\Scripts\\python.exe -m scripts.chunk_knowledge_base
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

from src.chunking import record_to_chunks
from src.config import (
    CHUNK_INPUT_RELPATH,
    CHUNK_OUTPUT_RELPATH,
    CHUNK_OVERLAP_CHARS,
    CHUNK_STATS_RELPATH,
    CHUNK_TARGET_CHARS,
)
from src.preprocess import load_jsonl


def _validate_chunk(chunk: dict, row_num: int) -> list[str]:
    errors: list[str] = []
    required = ("chunk_id", "scholarship_id", "chunk_text")
    for key in required:
        value = chunk.get(key)
        if not isinstance(value, str) or not value.strip():
            errors.append(f"record {row_num}: chunk missing required string '{key}'")
    if not isinstance(chunk.get("chunk_index"), int):
        errors.append(f"record {row_num}: chunk_index must be int")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description="Chunk cleaned scholarship rows for retrieval")
    parser.add_argument("--input", type=Path, default=ROOT / CHUNK_INPUT_RELPATH)
    parser.add_argument("--output", type=Path, default=ROOT / CHUNK_OUTPUT_RELPATH)
    parser.add_argument("--stats", type=Path, default=ROOT / CHUNK_STATS_RELPATH)
    parser.add_argument("--target-chars", type=int, default=CHUNK_TARGET_CHARS)
    parser.add_argument("--overlap-chars", type=int, default=CHUNK_OVERLAP_CHARS)
    args = parser.parse_args()

    if args.target_chars <= 0:
        print("ERROR: --target-chars must be > 0", file=sys.stderr)
        return 1
    if args.overlap_chars < 0 or args.overlap_chars >= args.target_chars:
        print("ERROR: --overlap-chars must be >= 0 and < --target-chars", file=sys.stderr)
        return 1

    input_path: Path = args.input
    output_path: Path = args.output
    stats_path: Path = args.stats

    if not input_path.is_file():
        print(f"ERROR: input file not found: {input_path.resolve()}", file=sys.stderr)
        return 1

    try:
        records = load_jsonl(str(input_path))
    except ValueError as e:
        print(f"ERROR: {e}", file=sys.stderr)
        return 1

    chunks: list[dict] = []
    errors: list[str] = []
    no_text_count = 0

    for row_num, record in enumerate(records, start=1):
        row_chunks = record_to_chunks(
            record,
            target_chars=args.target_chars,
            overlap_chars=args.overlap_chars,
        )
        if not row_chunks:
            no_text_count += 1
            continue
        for chunk in row_chunks:
            errors.extend(_validate_chunk(chunk, row_num))
        chunks.extend(row_chunks)

    if errors:
        print("ERROR: chunk validation failed:", file=sys.stderr)
        for msg in errors[:50]:
            print(f"  - {msg}", file=sys.stderr)
        return 1

    output_path.parent.mkdir(parents=True, exist_ok=True)
    stats_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, "w", encoding="utf-8") as f:
        for chunk in chunks:
            f.write(json.dumps(chunk, ensure_ascii=False) + "\n")

    avg_chunks = (len(chunks) / len(records)) if records else 0.0
    stats = {
        "input_path": str(input_path.resolve()),
        "output_path": str(output_path.resolve()),
        "stats_path": str(stats_path.resolve()),
        "target_chars": args.target_chars,
        "overlap_chars": args.overlap_chars,
        "input_rows": len(records),
        "output_chunks": len(chunks),
        "rows_without_chunk_text": no_text_count,
        "avg_chunks_per_row": round(avg_chunks, 3),
    }
    with open(stats_path, "w", encoding="utf-8") as f:
        json.dump(stats, f, indent=2, ensure_ascii=False)

    print(
        "OK: wrote "
        f"{len(chunks)} chunks to {output_path.resolve()} "
        f"(rows={len(records)}, no_text={no_text_count})"
    )
    print(f"OK: wrote stats to {stats_path.resolve()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
