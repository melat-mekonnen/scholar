"""
Milestone 7 — Retrieve context + prompt + local Ollama generation.

Run from scholar-ml root:
  .venv\\Scripts\\python.exe -m scripts.chat_once "masters scholarship in AI"

Dry run (no Ollama call, useful for prompt/debug testing):
  .venv\\Scripts\\python.exe -m scripts.chat_once "masters scholarship in AI" --dry-run
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
os.chdir(ROOT)

from dotenv import load_dotenv

load_dotenv(ROOT / ".env")
load_dotenv(ROOT / ".env.example", override=False)

from src.chat_service import ChatService
from src.config import (
    CHAT_CONTEXT_TOP_K,
    EMBEDDING_MODEL,
    INDEX_OUTPUT_FAISS_RELPATH,
    INDEX_OUTPUT_META_RELPATH,
    OLLAMA_CHAT_TIMEOUT_SECONDS,
    OLLAMA_DEFAULT_HOST,
    OLLAMA_DEFAULT_MODEL,
    RETRIEVAL_FILTER_OVERSAMPLE,
)


def _citations_text(citations: list[dict]) -> str:
    lines: list[str] = []
    for i, r in enumerate(citations, start=1):
        title = str(r.get("title") or "Untitled").strip()
        url = str(r.get("url") or "").strip()
        cid = str(r.get("chunk_id") or "").strip()
        lines.append(f"- [{i}] {title} | {url or 'N/A'} | {cid or 'no-chunk-id'}")
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description="Retrieve + prompt + Ollama one-shot chat")
    parser.add_argument("message", help="User message/question")
    parser.add_argument("--top-k", type=int, default=CHAT_CONTEXT_TOP_K)
    parser.add_argument("--model", default=os.environ.get("OLLAMA_MODEL", OLLAMA_DEFAULT_MODEL))
    parser.add_argument("--ollama-host", default=os.environ.get("OLLAMA_HOST", OLLAMA_DEFAULT_HOST))
    parser.add_argument("--index", type=Path, default=ROOT / INDEX_OUTPUT_FAISS_RELPATH)
    parser.add_argument("--meta", type=Path, default=ROOT / INDEX_OUTPUT_META_RELPATH)
    parser.add_argument("--embedding-model", default=EMBEDDING_MODEL)
    parser.add_argument("--country", default="")
    parser.add_argument("--degree-level", default="", dest="degree_level")
    parser.add_argument("--funding-type", default="", dest="funding_type")
    parser.add_argument("--field", default="")
    parser.add_argument("--oversample", type=int, default=RETRIEVAL_FILTER_OVERSAMPLE)
    parser.add_argument("--timeout-seconds", type=int, default=OLLAMA_CHAT_TIMEOUT_SECONDS)
    parser.add_argument("--user-id", default="", dest="user_id", help="Student user UUID for profile-based eligibility")
    parser.add_argument("--dry-run", action="store_true", help="Skip Ollama call; print prompt + citations only")
    parser.add_argument("--json", action="store_true", help="Print JSON output")
    args = parser.parse_args()

    if not args.index.is_file():
        print(f"ERROR: FAISS index not found: {args.index.resolve()}", file=sys.stderr)
        print("Run: python -m scripts.build_index", file=sys.stderr)
        return 1
    if not args.meta.is_file():
        print(f"ERROR: chunk metadata not found: {args.meta.resolve()}", file=sys.stderr)
        return 1

    filters_dict = {
        "country": args.country or None,
        "degree_level": args.degree_level or None,
        "funding_type": args.funding_type or None,
        "field": args.field or None,
    }
    filters_dict = {k: v for k, v in filters_dict.items() if v}

    service = ChatService(
        index_path=args.index,
        meta_path=args.meta,
        embedding_model=args.embedding_model,
        ollama_host=args.ollama_host,
        ollama_model=args.model,
        ollama_timeout_seconds=args.timeout_seconds,
        filter_oversample=args.oversample,
    )

    try:
        result = service.chat(
            args.message,
            top_k=args.top_k,
            filters=filters_dict,
            user_id=args.user_id or None,
            dry_run=args.dry_run,
        )
    except Exception as e:
        print(f"ERROR: chat failed: {e}", file=sys.stderr)
        if not args.dry_run:
            print("Tip: ensure `ollama serve` is running and model is available.", file=sys.stderr)
        return 1

    if args.json:
        print(
            json.dumps(
                {
                    "answer": result.answer,
                    "citations": result.citations,
                    "used_filters": result.used_filters,
                    "retrieved_count": result.retrieved_count,
                    "mode": result.mode,
                    "dry_run": result.dry_run,
                    "eligibility": result.eligibility,
                    "profile_loaded": result.profile_loaded,
                },
                ensure_ascii=False,
                indent=2,
            )
        )
        return 0

    print(f"Question: {args.message!r}")
    if filters_dict:
        print(f"Filters: {filters_dict}")
    print(f"Mode: {result.mode}")
    print(f"Profile loaded: {result.profile_loaded}")
    print(f"Retrieved context rows: {result.retrieved_count}")
    if result.eligibility:
        print("\nEligibility assessment:\n")
        print(json.dumps(result.eligibility, ensure_ascii=False, indent=2))
    print("\nAnswer:\n")
    print(result.answer)
    print("\nCitations:\n")
    print(_citations_text(result.citations) if result.citations else "- None")
    if args.dry_run:
        print("\n[Dry run] Prompts were built but not sent to Ollama.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
