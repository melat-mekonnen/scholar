"""
Milestone 5 — Build embeddings + FAISS index from chunks.

Reads:
  - data/chunks.jsonl

Writes:
  - artifacts/index.faiss
  - artifacts/chunks_meta.json
  - artifacts/index.stats.json

Run from scholar-ml root:
  .venv\\Scripts\\python.exe -m scripts.build_index
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

import faiss

from src.config import (
    EMBEDDING_DIMENSION,
    EMBEDDING_MODEL,
    INDEX_INPUT_CHUNKS_RELPATH,
    INDEX_OUTPUT_FAISS_RELPATH,
    INDEX_OUTPUT_META_RELPATH,
    INDEX_OUTPUT_STATS_RELPATH,
    RETRIEVAL_TOP_K,
)
from src.indexing import build_faiss_index, encode_texts, load_embedder, meta_from_chunk
from src.preprocess import load_jsonl, normalize_whitespace


def _validate_chunk(chunk: dict, row_num: int) -> list[str]:
    errs: list[str] = []
    for key in ("chunk_id", "scholarship_id", "chunk_text"):
        value = chunk.get(key)
        if not isinstance(value, str) or not value.strip():
            errs.append(f"line {row_num}: invalid chunk key '{key}'")
    return errs


def _smoke_query(
    query: str,
    model_name: str,
    index_path: Path,
    meta_path: Path,
    top_k: int,
) -> int:
    model = load_embedder(model_name)
    qv = encode_texts(model, [query])
    index = faiss.read_index(str(index_path))
    with open(meta_path, "r", encoding="utf-8") as f:
        meta = json.load(f)
    scores, ids = index.search(qv, top_k)
    print(f"Smoke query: {query!r}")
    for rank, (score, idx) in enumerate(zip(scores[0], ids[0]), start=1):
        if idx < 0 or idx >= len(meta):
            continue
        row = meta[idx]
        print(
            f"  {rank}. score={score:.4f} chunk_id={row.get('chunk_id')} "
            f"title={row.get('title')} url={row.get('url')}"
        )
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Build FAISS index from data/chunks.jsonl")
    parser.add_argument("--input", type=Path, default=ROOT / INDEX_INPUT_CHUNKS_RELPATH)
    parser.add_argument("--index-out", type=Path, default=ROOT / INDEX_OUTPUT_FAISS_RELPATH)
    parser.add_argument("--meta-out", type=Path, default=ROOT / INDEX_OUTPUT_META_RELPATH)
    parser.add_argument("--stats-out", type=Path, default=ROOT / INDEX_OUTPUT_STATS_RELPATH)
    parser.add_argument("--model", default=EMBEDDING_MODEL)
    parser.add_argument("--batch-size", type=int, default=64)
    parser.add_argument("--smoke-query", default="")
    parser.add_argument("--smoke-top-k", type=int, default=5)
    args = parser.parse_args()

    if not args.input.is_file():
        print(f"ERROR: chunks input file not found: {args.input.resolve()}", file=sys.stderr)
        return 1
    if args.batch_size <= 0:
        print("ERROR: --batch-size must be > 0", file=sys.stderr)
        return 1

    try:
        rows = load_jsonl(str(args.input))
    except ValueError as e:
        print(f"ERROR: {e}", file=sys.stderr)
        return 1

    errors: list[str] = []
    texts: list[str] = []
    meta: list[dict] = []
    for i, row in enumerate(rows, start=1):
        if not isinstance(row, dict):
            errors.append(f"line {i}: expected object, got {type(row)}")
            continue
        errors.extend(_validate_chunk(row, i))
        chunk_text = normalize_whitespace(row.get("chunk_text"))
        if not chunk_text:
            errors.append(f"line {i}: empty chunk_text after normalization")
            continue
        texts.append(chunk_text)
        meta.append(meta_from_chunk(row))

    if errors:
        print("ERROR: chunk validation failed:", file=sys.stderr)
        for err in errors[:60]:
            print(f"  - {err}", file=sys.stderr)
        return 1
    if not texts:
        print("ERROR: no valid chunk_text rows to embed", file=sys.stderr)
        return 1

    model = load_embedder(args.model)
    vectors = encode_texts(model, texts, batch_size=args.batch_size)
    dim = int(vectors.shape[1])
    if EMBEDDING_DIMENSION != dim:
        print(
            f"WARN: config EMBEDDING_DIMENSION={EMBEDDING_DIMENSION} "
            f"but model produced dim={dim}; using actual model dim.",
            file=sys.stderr,
        )

    index = build_faiss_index(vectors)

    args.index_out.parent.mkdir(parents=True, exist_ok=True)
    args.meta_out.parent.mkdir(parents=True, exist_ok=True)
    args.stats_out.parent.mkdir(parents=True, exist_ok=True)

    faiss.write_index(index, str(args.index_out))
    with open(args.meta_out, "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

    stats = {
        "input_path": str(args.input.resolve()),
        "index_path": str(args.index_out.resolve()),
        "meta_path": str(args.meta_out.resolve()),
        "stats_path": str(args.stats_out.resolve()),
        "embedding_model": args.model,
        "embedding_dimension": dim,
        "chunk_rows": len(rows),
        "indexed_vectors": int(index.ntotal),
        "faiss_index_type": "IndexFlatIP",
    }
    with open(args.stats_out, "w", encoding="utf-8") as f:
        json.dump(stats, f, ensure_ascii=False, indent=2)

    print(
        "OK: built FAISS index "
        f"({index.ntotal} vectors, dim={dim}) at {args.index_out.resolve()}"
    )
    print(f"OK: wrote chunk metadata to {args.meta_out.resolve()}")
    print(f"OK: wrote stats to {args.stats_out.resolve()}")

    if args.smoke_query.strip():
        top_k = max(1, min(args.smoke_top_k, RETRIEVAL_TOP_K * 2))
        return _smoke_query(
            query=args.smoke_query.strip(),
            model_name=args.model,
            index_path=args.index_out,
            meta_path=args.meta_out,
            top_k=top_k,
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
