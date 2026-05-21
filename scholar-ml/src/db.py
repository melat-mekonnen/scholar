"""
Shared Postgres helpers for Scholar-ML runtime reads (student profiles).
"""
from __future__ import annotations

import os
from urllib.parse import urlparse

import psycopg2
from psycopg2.extras import RealDictCursor


def database_url() -> str:
    url = os.environ.get("DATABASE_URL", "").strip()
    if not url:
        raise RuntimeError("DATABASE_URL is not set")
    return url


def _use_ssl(database_url: str) -> bool:
    parsed = urlparse(database_url)
    host = (parsed.hostname or "").lower()
    q = parsed.query.lower()
    if "sslmode=disable" in q:
        return False
    if host in ("localhost", "127.0.0.1"):
        return False
    return True


def connect():
    url = database_url()
    kwargs: dict = {"cursor_factory": RealDictCursor}
    if _use_ssl(url):
        kwargs["sslmode"] = "require"
    return psycopg2.connect(url, **kwargs)
