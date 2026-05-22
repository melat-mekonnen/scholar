"""
Milestone 6 — FAISS retrieval with optional hard filters on chunk metadata.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import faiss
from sentence_transformers import SentenceTransformer

from src.indexing import encode_texts


_TITLE_STOPWORDS = frozenset(
    {
        "a",
        "an",
        "the",
        "and",
        "or",
        "for",
        "at",
        "in",
        "of",
        "to",
        "on",
        "with",
        "university",
        "international",
        "scholarship",
        "scholarships",
        "program",
        "programme",
        "award",
        "graduate",
        "undergraduate",
        "government",
        "excellence",
        "student",
        "students",
    }
)


def _meta_to_result(meta: dict[str, Any], *, score: float, rank: int) -> dict[str, Any]:
    return {
        "score": score,
        "chunk_id": meta.get("chunk_id"),
        "scholarship_id": meta.get("scholarship_id"),
        "title": meta.get("title"),
        "url": meta.get("url"),
        "chunk_text": meta.get("chunk_text"),
        "country": meta.get("country"),
        "degree_level": meta.get("degree_level"),
        "field_of_study": meta.get("field_of_study"),
        "funding_type": meta.get("funding_type"),
        "deadline": meta.get("deadline"),
        "rank": rank,
    }


def _named_tokens_in_query(query: str, meta: list[dict[str, Any]]) -> set[str]:
    """Tokens from scholarship titles that also appear in the user query."""
    q = _norm(query)
    if not q:
        return set()

    title_tokens: set[str] = set()
    for row in meta:
        title = _norm(row.get("title"))
        if not title:
            continue
        for raw in title.split():
            token = raw.strip(".,/()[]")
            if len(token) < 4 or token in _TITLE_STOPWORDS:
                continue
            title_tokens.add(token)

    return {tok for tok in title_tokens if tok in q}


def _collect_named_scholarship_rows(
    meta: list[dict[str, Any]],
    tokens: set[str],
    filt: RetrievalFilters,
    *,
    limit: int,
) -> list[dict[str, Any]]:
    if not tokens or limit <= 0:
        return []

    out: list[dict[str, Any]] = []
    for m in meta:
        if not passes_filters(m, filt):
            continue
        title = _norm(m.get("title"))
        if not title or not any(tok in title for tok in tokens):
            continue
        out.append(_meta_to_result(m, score=1.0, rank=len(out) + 1))
        if len(out) >= limit:
            break
    return out


def _norm(s: Any) -> str:
    if s is None:
        return ""
    t = s if isinstance(s, str) else str(s)
    return t.strip().casefold()


@dataclass(frozen=True)
class RetrievalFilters:
    country: str | None = None
    degree_level: str | None = None
    funding_type: str | None = None
    field: str | None = None  # matches field_of_study (substring, case-insensitive)

    @classmethod
    def from_dict(cls, d: dict[str, Any] | None) -> RetrievalFilters:
        if not d:
            return cls()
        return cls(
            country=d.get("country") or d.get("country_code"),
            degree_level=d.get("degree_level"),
            funding_type=d.get("funding_type"),
            field=d.get("field") or d.get("field_of_study"),
        )

    def any_active(self) -> bool:
        return bool(
            _norm(self.country)
            or _norm(self.degree_level)
            or _norm(self.funding_type)
            or _norm(self.field)
        )


def passes_filters(meta: dict[str, Any], f: RetrievalFilters) -> bool:
    if not f.any_active():
        return True

    if _norm(f.country):
        mc = _norm(meta.get("country"))
        fc = _norm(f.country)
        if not mc or (mc != fc and fc not in mc and mc not in fc):
            return False

    if _norm(f.degree_level):
        if _norm(meta.get("degree_level")) != _norm(f.degree_level):
            return False

    if _norm(f.funding_type):
        if _norm(meta.get("funding_type")) != _norm(f.funding_type):
            return False

    if _norm(f.field):
        field_meta = _norm(meta.get("field_of_study"))
        field_f = _norm(f.field)
        if not field_meta or field_f not in field_meta:
            return False

    return True


def has_named_scholarship_in_query(query: str, meta: list[dict[str, Any]]) -> bool:
    return bool(_named_tokens_in_query(str(query).strip(), meta))


def retrieve(
    query: str,
    model: SentenceTransformer,
    index: faiss.Index,
    meta: list[dict[str, Any]],
    top_k: int = 10,
    filters: RetrievalFilters | None = None,
    filter_oversample: int = 5,
) -> list[dict[str, Any]]:
    """
    Embed query, search FAISS (inner product on normalized embeddings = cosine similarity).
    Apply hard filters; if filters are active, request more neighbors first, then full index if needed.
    """
    if top_k <= 0:
        raise ValueError("top_k must be > 0")
    if not query or not str(query).strip():
        raise ValueError("query must be non-empty")
    ntotal = int(index.ntotal)
    if ntotal == 0:
        return []
    if len(meta) != ntotal:
        raise ValueError(f"meta length ({len(meta)}) must match index.ntotal ({ntotal})")

    f = filters or RetrievalFilters()
    qv = encode_texts(model, [str(query).strip()])

    def search_and_collect(k_req: int) -> list[dict[str, Any]]:
        k_req = max(1, min(ntotal, k_req))
        scores, ids = index.search(qv, k_req)
        row_scores = scores[0]
        row_ids = ids[0]
        out: list[dict[str, Any]] = []
        for rank in range(k_req):
            idx = int(row_ids[rank])
            if idx < 0 or idx >= ntotal:
                continue
            m = meta[idx]
            if not passes_filters(m, f):
                continue
            out.append(
                _meta_to_result(m, score=float(row_scores[rank]), rank=len(out) + 1)
            )
            if len(out) >= top_k:
                break
        for i, row in enumerate(out[:top_k], start=1):
            row["rank"] = i
        return out[:top_k]

    k_first = top_k
    if f.any_active():
        k_first = min(ntotal, max(top_k, top_k * max(1, filter_oversample)))

    results = search_and_collect(k_first)
    if f.any_active() and len(results) < top_k and k_first < ntotal:
        results = search_and_collect(ntotal)

    named_tokens = _named_tokens_in_query(str(query).strip(), meta)
    if named_tokens:
        named_rows = _collect_named_scholarship_rows(meta, named_tokens, f, limit=top_k)
        if named_rows:
            return named_rows[:top_k]

    return results
