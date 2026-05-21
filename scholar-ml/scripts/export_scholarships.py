"""
Milestone 1 — Export verified scholarships from Postgres to JSONL for RAG.

Run from scholar-ml root (with .env containing DATABASE_URL):

  .venv\\Scripts\\python.exe -m scripts.export_scholarships

Optional:

  .venv\\Scripts\\python.exe -m scripts.export_scholarships --output data/knowledge_base.jsonl
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

# Project root = parent of scripts/
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

os.chdir(ROOT)

from dotenv import load_dotenv

load_dotenv(ROOT / ".env")
load_dotenv(ROOT / ".env.example", override=False)

from src.config import EXPORT_INCLUDE_NULL_DEADLINE, EXPORT_SCHOLARSHIP_STATUS


def _use_ssl(database_url: str) -> bool:
    parsed = urlparse(database_url)
    host = (parsed.hostname or "").lower()
    q = parsed.query.lower()
    if "sslmode=disable" in q:
        return False
    if host in ("localhost", "127.0.0.1"):
        return False
    return True


def _build_sql() -> str:
    """Match EthioScholar public browse: verified + active deadlines."""
    if EXPORT_INCLUDE_NULL_DEADLINE:
        deadline_clause = "(s.deadline IS NULL OR s.deadline >= CURRENT_DATE)"
    else:
        deadline_clause = "s.deadline IS NOT NULL AND s.deadline >= CURRENT_DATE"

    return f"""
    SELECT
      s.id,
      s.title,
      s.organization_name,
      s.country,
      s.deadline,
      s.application_start_date,
      s.application_end_date,
      s.degree_level,
      s.status,
      s.funding_type,
      s.field_of_study,
      s.amount,
      s.description,
      s.application_url,
      s.source_name,
      s.source_url,
      s.external_id,
      s.is_recommended_default,
      s.created_at,
      s.updated_at
    FROM scholarships s
    WHERE s.status = %s
      AND {deadline_clause}
    ORDER BY s.deadline ASC NULLS LAST, s.title ASC
    """


def _row_to_record(row: dict) -> dict:
    exported_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    def iso(v):
        if v is None:
            return None
        if hasattr(v, "isoformat"):
            return v.isoformat() if hasattr(v, "hour") else str(v)
        return v

    return {
        "source_type": "database",
        "scholarship_id": str(row["id"]),
        "title": row["title"],
        "organization_name": row["organization_name"],
        "country": row["country"],
        "deadline": iso(row["deadline"]),
        "application_start_date": iso(row["application_start_date"]),
        "application_end_date": iso(row["application_end_date"]),
        "degree_level": row["degree_level"],
        "status": row["status"],
        "funding_type": row["funding_type"],
        "field_of_study": row["field_of_study"],
        "amount": row["amount"],
        "description": row["description"] or "",
        "application_url": row["application_url"],
        "source_name": row["source_name"],
        "source_url": row["source_url"],
        "external_id": row["external_id"],
        "is_recommended_default": bool(row["is_recommended_default"])
        if row["is_recommended_default"] is not None
        else False,
        "created_at": iso(row["created_at"]),
        "updated_at": iso(row["updated_at"]),
        "exported_at": exported_at,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Export verified scholarships to JSONL")
    parser.add_argument(
        "--output",
        type=Path,
        default=ROOT / "data" / "knowledge_base.jsonl",
        help="Output JSONL path (default: data/knowledge_base.jsonl)",
    )
    args = parser.parse_args()
    output: Path = args.output

    database_url = os.environ.get("DATABASE_URL", "").strip()
    if not database_url:
        print("ERROR: DATABASE_URL is not set. Copy .env.example to .env and set DATABASE_URL.", file=sys.stderr)
        return 1

    try:
        import psycopg2
        from psycopg2.extras import RealDictCursor
    except ImportError:
        print("ERROR: psycopg2 not installed. Run: pip install -r requirements.txt", file=sys.stderr)
        return 1

    output.parent.mkdir(parents=True, exist_ok=True)

    connect_kwargs: dict = {"cursor_factory": RealDictCursor}
    if _use_ssl(database_url):
        connect_kwargs["sslmode"] = "require"
    else:
        connect_kwargs["sslmode"] = "disable"

    sql = _build_sql()
    count = 0
    try:
        conn = psycopg2.connect(database_url, **connect_kwargs)
    except Exception as e:
        print(f"ERROR: Could not connect to database: {e}", file=sys.stderr)
        return 1

    try:
        with conn.cursor() as cur:
            cur.execute(sql, (EXPORT_SCHOLARSHIP_STATUS,))
            rows = cur.fetchall()
        with open(output, "w", encoding="utf-8") as f:
            for row in rows:
                rec = _row_to_record(dict(row))
                f.write(json.dumps(rec, ensure_ascii=False) + "\n")
                count += 1
    finally:
        conn.close()

    print(f"OK: wrote {count} rows to {output.resolve()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
