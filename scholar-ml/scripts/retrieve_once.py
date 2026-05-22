"""
Milestone 6 — CLI: embed query, FAISS top-K, optional hard filters.

Run from scholar-ml root:
  .venv\\Scripts\\python.exe -m scripts.retrieve_once "masters scholarship in AI"

With filters (match M8-style names):
  .venv\\Scripts\\python.exe -m scripts.retrieve_once "scholarship" --country ET --degree-level masters --field "computer"
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
    EMBEDDING_MODEL,
    INDEX_OUTPUT_FAISS_RELPATH,
    INDEX_OUTPUT_META_RELPATH,
    RETRIEVAL_FILTER_OVERSAMPLE,
    RETRIEVAL_TOP_K,
)
from src.indexing import load_embedder
from src.retrieve import RetrievalFilters, retrieve


def main() -> int:
    parser = argparse.ArgumentParser(description="Retrieve top-K chunks from FAISS with optional filters")
    parser.add_argument("query", help="Search query text")
    parser.add_argument("--top-k", type=int, default=RETRIEVAL_TOP_K)
    parser.add_argument("--model", default=EMBEDDING_MODEL)
    parser.add_argument("--index", type=Path, default=ROOT / INDEX_OUTPUT_FAISS_RELPATH)
    parser.add_argument("--meta", type=Path, default=ROOT / INDEX_OUTPUT_META_RELPATH)
    parser.add_argument("--country", default="")
    parser.add_argument("--degree-level", default="", dest="degree_level")
    parser.add_argument("--funding-type", default="", dest="funding_type")
    parser.add_argument("--field", default="", help="Substring match on field_of_study")
    parser.add_argument("--oversample", type=int, default=RETRIEVAL_FILTER_OVERSAMPLE)
    parser.add_argument("--json", action="store_true", help="Print JSON array to stdout")
    args = parser.parse_args()

    if not args.index.is_file():
        print(f"ERROR: FAISS index not found: {args.index.resolve()}", file=sys.stderr)
        print("Run: python -m scripts.build_index", file=sys.stderr)
        return 1
    if not args.meta.is_file():
        print(f"ERROR: chunk metadata not found: {args.meta.resolve()}", file=sys.stderr)
        return 1

    filt = RetrievalFilters(
        country=args.country or None,
        degree_level=args.degree_level or None,
        funding_type=args.funding_type or None,
        field=args.field or None,
    )

    with open(args.meta, "r", encoding="utf-8") as f:
        meta = json.load(f)
    if not isinstance(meta, list):
        print("ERROR: chunks_meta.json must be a JSON array", file=sys.stderr)
        return 1

    index = faiss.read_index(str(args.index))
    model = load_embedder(args.model)

    rows = retrieve(
        args.query,
        model=model,
        index=index,
        meta=meta,
        top_k=args.top_k,
        filters=filt,
        filter_oversample=args.oversample,
    )

    if args.json:
        print(json.dumps(rows, ensure_ascii=False, indent=2))
    else:
        print(f"Query: {args.query!r}")
        if filt.any_active():
            print(f"Filters: {filt}")
        if not rows:
            print("No matching chunks (empty index or all filtered out).")
            return 0
        for r in rows:
            print(
                f"  {r['rank']}. score={r['score']:.4f} chunk_id={r.get('chunk_id')} "
                f"scholarship_id={r.get('scholarship_id')} country={r.get('country')} "
                f"title={r.get('title')} url={r.get('url')}"
            )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
