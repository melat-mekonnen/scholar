from __future__ import annotations

import html
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Optional, Dict, Any, Literal
from urllib.parse import urlparse

import feedparser
import httpx
from fastapi import FastAPI
from pydantic import BaseModel, Field
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from app.api.chat_router import router as chat_router

app = FastAPI(title="Scholar AI Service", version="0.1.0")
app.include_router(chat_router)


class StudentIn(BaseModel):
    id: Optional[str] = None
    text: str = Field(min_length=1, max_length=8000)


class ScholarshipIn(BaseModel):
    id: str = Field(min_length=1, max_length=200)
    title: str = Field(default="", max_length=500)
    description: str = Field(default="", max_length=20000)
    meta: Optional[Dict[str, Any]] = None


class RecommendRequest(BaseModel):
    student: StudentIn
    scholarships: List[ScholarshipIn] = Field(min_length=1, max_length=500)
    topN: int = Field(default=10, ge=1, le=200)
    includeMatchedTerms: bool = True


class RecommendResult(BaseModel):
    id: str
    score: float
    matchPercent: float = Field(
        ...,
        description=(
            "0–100 vs the best match in this request: 100 × (your score / max score in batch). "
            "Only 0% when similarity is ~0. Raw value is in `score`."
        ),
    )
    matchedTerms: Optional[List[str]] = None


class RecommendResponse(BaseModel):
    results: List[RecommendResult]

class StudentProfileIn(BaseModel):
    fieldOfStudy: Optional[str] = None
    degreeLevel: Optional[str] = None
    gpa: Optional[float] = None
    interests: Optional[List[str]] = None
    preferredCountry: Optional[str] = None


class DiscoverRequest(BaseModel):
    student: StudentProfileIn
    topN: int = Field(default=20, ge=1, le=50)
    providers: Optional[List[Literal["mock", "rss"]]] = None
    rss_feed_urls: Optional[List[str]] = Field(
        default=None,
        max_length=20,
        description="RSS/Atom URLs when using the rss provider.",
    )


class FeedFetchRequest(BaseModel):
    feed_urls: List[str] = Field(..., min_length=1, max_length=20)


class FeedItemOut(BaseModel):
    title: str
    description: str
    sourceUrl: str
    sourceName: str
    published: Optional[str] = None


class FeedFetchResponse(BaseModel):
    items: List[FeedItemOut]
    errors: List[str] = Field(default_factory=list)


class DiscoveredScholarship(BaseModel):
    title: str
    description: str
    country: Optional[str] = None
    degreeLevel: Optional[str] = None
    fieldOfStudy: Optional[str] = None
    deadline: Optional[str] = None  # ISO date string if available
    sourceName: str
    sourceUrl: str
    confidence: float
    matchPercent: float = Field(
        ...,
        description="100 × (score / max score in batch); raw cosine in `confidence`.",
    )
    matchedTerms: Optional[List[str]] = None


class DiscoverResponse(BaseModel):
    query: str
    results: List[DiscoveredScholarship]


def _student_query_from_profile(p: StudentProfileIn) -> str:
    parts: List[str] = []
    if p.fieldOfStudy:
        parts.append(p.fieldOfStudy)
    if p.degreeLevel:
        parts.append(p.degreeLevel)
    if p.preferredCountry:
        parts.append(p.preferredCountry)
    if p.interests:
        parts.extend([i for i in p.interests if i])
    parts.append("scholarship")
    parts.append("2026")
    return " ".join([x.strip() for x in parts if x and x.strip()])


def _scholarship_text(s: ScholarshipIn) -> str:
    # Keep it simple and robust for messy data.
    title = (s.title or "").strip()
    desc = (s.description or "").strip()
    if title and desc:
        return f"{title}\n{desc}"
    return title or desc or ""


def _percent_vs_best_in_batch(scores: np.ndarray) -> np.ndarray:
    """
    UI percent = 100 × (score / max_score) within this request.

    Unlike min–max, the *weakest* non-zero match is not forced to 0% — it keeps a
    fair fraction of the best (e.g. half the similarity → ~50%). Only ~0 score → 0%.
    """
    s = np.asarray(scores, dtype=np.float64).flatten()
    s = np.nan_to_num(s, nan=0.0, posinf=1.0, neginf=0.0)
    s = np.clip(s, 0.0, 1.0)
    max_s = float(np.max(s))
    if max_s <= 1e-15:
        return np.round(np.zeros_like(s), 1)
    out = (s / max_s) * 100.0
    return np.round(out, 1)


def _token_set(text: str) -> set:
    """
    Word tokens for overlap metrics. Must support non‑Latin scripts (Amharic, Arabic, etc.);
    ASCII-only regex would yield an empty set and force 0% for every card.
    """
    s = (text or "").strip().lower()
    if not s:
        return set()
    # Python 3: \\w is Unicode letter/digit/underscore across scripts
    words = re.findall(r"\w+", s, flags=re.UNICODE)
    out = {w for w in words if w}
    if out:
        return out
    return {t for t in s.split() if t}


def _overlap_jaccard_scores(student_text: str, corpus: List[str]) -> np.ndarray:
    """
    Fallback when TF‑IDF cosines are all zero: Jaccard similarity of word tokens
    between the student string and each scholarship document.
    """
    st = _token_set(student_text)
    out: List[float] = []
    for doc in corpus:
        dt = _token_set(doc)
        if not st or not dt:
            out.append(0.0)
            continue
        inter = len(st & dt)
        union = len(st | dt)
        out.append(float(inter) / float(union) if union else 0.0)
    return np.asarray(out, dtype=np.float64)


def _substring_token_hits(student_text: str, corpus: List[str]) -> np.ndarray:
    """Last resort: fraction of student tokens (length ≥3) found as substrings in each doc."""
    st = [t for t in _token_set(student_text) if len(t) >= 3]
    if not st:
        st = list(_token_set(student_text))
    if not st:
        return np.zeros(len(corpus), dtype=np.float64)
    out: List[float] = []
    n = len(st)
    for doc in corpus:
        d = (doc or "").lower()
        hits = sum(1 for t in st if t in d)
        out.append(float(hits) / float(n))
    return np.asarray(out, dtype=np.float64)


def _char_bigram_jaccard(student_text: str, corpus: List[str]) -> np.ndarray:
    """
    Last-resort similarity when token overlap is empty everywhere (e.g. 'cs' vs 'computer science',
    or no shared script tokens). Uses character bigrams on normalized text.
    """
    def bigrams(t: str) -> set:
        t = re.sub(r"\s+", " ", (t or "").lower().strip())
        if len(t) < 2:
            return set()
        return {t[i : i + 2] for i in range(len(t) - 1)}

    st = bigrams(student_text)
    out: List[float] = []
    for doc in corpus:
        dt = bigrams(doc)
        if not st or not dt:
            out.append(0.0)
            continue
        inter = len(st & dt)
        union = len(st | dt)
        out.append(float(inter) / float(union) if union else 0.0)
    return np.asarray(out, dtype=np.float64)


def _strip_html(s: str) -> str:
    if not s:
        return ""
    t = re.sub(r"<[^>]+>", " ", s)
    t = html.unescape(t)
    return re.sub(r"\s+", " ", t).strip()


def _safe_feed_url(url: str) -> Optional[str]:
    u = (url or "").strip()
    if not u:
        return None
    p = urlparse(u)
    if p.scheme not in ("http", "https"):
        return None
    return u


# Short timeouts so bad DNS / dead hosts cannot block the API for minutes.
_HTTP_TIMEOUT = httpx.Timeout(12.0, connect=4.0, read=10.0)
_MAX_FEED_BYTES = 3 * 1024 * 1024


def _fetch_rss_scholarships(feed_url: str, max_items: int = 40) -> List[Dict[str, Any]]:
    """Parse RSS/Atom; each entry becomes a discoverable row (real external link)."""
    safe = _safe_feed_url(feed_url)
    if not safe:
        return []
    with httpx.Client(timeout=_HTTP_TIMEOUT, follow_redirects=True) as client:
        r = client.get(
            safe,
            headers={
                "User-Agent": "ScholarAI/1.0 (scholarship discovery; educational)",
                "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
            },
        )
        r.raise_for_status()
    if len(r.content) > _MAX_FEED_BYTES:
        raise ValueError(f"Feed larger than {_MAX_FEED_BYTES} bytes")
    parsed = feedparser.parse(r.content)
    feed_title = getattr(parsed.feed, "title", None) or urlparse(safe).netloc or "RSS"
    out: List[Dict[str, Any]] = []
    for entry in getattr(parsed, "entries", [])[:max_items]:
        title = _strip_html(getattr(entry, "title", "") or "")[:500]
        link = (getattr(entry, "link", "") or "").strip()
        if hasattr(entry, "links") and entry.links:
            for L in entry.links:
                if L.get("rel") == "alternate" and L.get("href"):
                    link = str(L["href"]).strip()
                    break
        summary = ""
        if getattr(entry, "summary", None):
            summary = _strip_html(str(entry.summary))
        elif getattr(entry, "description", None):
            summary = _strip_html(str(entry.description))
        elif getattr(entry, "content", None) and entry.content:
            try:
                summary = _strip_html(str(entry.content[0].get("value", "")))
            except (IndexError, AttributeError, TypeError):
                summary = ""
        if not title or not link:
            continue
        published = None
        if getattr(entry, "published", None):
            published = str(entry.published)[:80]
        elif getattr(entry, "updated", None):
            published = str(entry.updated)[:80]
        out.append(
            {
                "title": title,
                "description": (summary or title)[:20000],
                "country": None,
                "degreeLevel": None,
                "fieldOfStudy": None,
                "deadline": published,
                "sourceName": str(feed_title)[:200],
                "sourceUrl": link[:2000],
            }
        )
    return out


@app.get("/health")
def health():
    return {"status": "ok"}


def _fetch_one_feed_safe(url: str) -> tuple[List[Dict[str, Any]], Optional[str]]:
    try:
        return _fetch_rss_scholarships(url), None
    except Exception as ex:  # noqa: BLE001
        return [], f"{url}: {ex!s}"


@app.post("/ai/feeds/fetch", response_model=FeedFetchResponse)
def fetch_feeds(req: FeedFetchRequest):
    """
    Fetch and normalize RSS/Atom entries for ingestion (no profile ranking).
    Admin reviews items before they become visible to students as verified listings.
    Feeds are fetched in parallel with strict per-request timeouts so one bad URL
    cannot block the whole import for minutes.
    """
    items_out: List[FeedItemOut] = []
    errors: List[str] = []
    seen_urls: set = set()

    urls: List[str] = []
    for raw_u in req.feed_urls[:20]:
        u = _safe_feed_url(raw_u)
        if not u:
            errors.append(f"Invalid or blocked URL: {raw_u!r}")
            continue
        urls.append(u)

    if not urls:
        return FeedFetchResponse(items=items_out, errors=errors)

    max_workers = min(6, len(urls))
    with ThreadPoolExecutor(max_workers=max_workers) as pool:
        futures = {pool.submit(_fetch_one_feed_safe, u): u for u in urls}
        for fut in as_completed(futures):
            u = futures[fut]
            try:
                rows, err = fut.result()
            except Exception as ex:  # noqa: BLE001
                errors.append(f"{u}: {ex!s}")
                continue
            if err:
                errors.append(err)
                continue
            for row in rows:
                su = (row.get("sourceUrl") or "").strip().lower()
                if not su or su in seen_urls:
                    continue
                seen_urls.add(su)
                items_out.append(
                    FeedItemOut(
                        title=str(row.get("title") or "")[:500],
                        description=str(row.get("description") or "")[:20000],
                        sourceUrl=str(row.get("sourceUrl") or "")[:2000],
                        sourceName=str(row.get("sourceName") or "RSS")[:200],
                        published=row.get("deadline"),
                    )
                )

    return FeedFetchResponse(items=items_out, errors=errors)


@app.post("/ai/recommend", response_model=RecommendResponse)
def recommend(req: RecommendRequest):
    # Build corpus
    corpus = [_scholarship_text(s) for s in req.scholarships]
    student_text = req.student.text.strip()

    # No English stop list: short student profiles often become empty vectors and score 0 everywhere.
    vectorizer = TfidfVectorizer(
        lowercase=True,
        stop_words=None,
        max_features=50000,
        ngram_range=(1, 2),
        min_df=1,
        max_df=1.0,
    )
    matrix = vectorizer.fit_transform(corpus + [student_text])

    sch_matrix = matrix[:-1]
    student_vec = matrix[-1]

    # Cosine similarity (can be all zeros if student row is empty or disjoint)
    scores = cosine_similarity(student_vec, sch_matrix).flatten()
    scores = np.nan_to_num(scores, nan=0.0, posinf=1.0, neginf=0.0)

    if float(np.max(scores)) < 1e-12:
        scores = _overlap_jaccard_scores(student_text, corpus)
    if float(np.max(scores)) < 1e-12:
        scores = _substring_token_hits(student_text, corpus)
    if float(np.max(scores)) < 1e-12:
        scores = _char_bigram_jaccard(student_text, corpus)

    pct_batch = _percent_vs_best_in_batch(scores)

    # Sort indices by score desc, then drop weak tail (avoids showing low-relevance "matches").
    ranked_full = sorted(range(len(req.scholarships)), key=lambda i: float(scores[i]), reverse=True)
    max_s = float(scores[ranked_full[0]]) if ranked_full else 0.0
    rel_floor = 0.14  # keep rows at least 14% of the best raw score in this batch
    if max_s <= 1e-15:
        ranked = ranked_full[: req.topN]
    else:
        threshold = max_s * rel_floor
        ranked = [i for i in ranked_full if float(scores[i]) >= threshold][: req.topN]
        if len(ranked) < 3:
            ranked = ranked_full[: min(req.topN, len(ranked_full))]

    matched_terms_by_idx: Dict[int, List[str]] = {}
    if req.includeMatchedTerms:
        feature_names = vectorizer.get_feature_names_out()
        student_nz = set(student_vec.nonzero()[1].tolist())
        st_tokens = _token_set(student_text)
        for i in ranked:
            if student_nz:
                sch_nz = set(sch_matrix[i].nonzero()[1].tolist())
                common = list(student_nz.intersection(sch_nz))
                weights = sch_matrix[i].toarray().flatten()
                common_sorted = sorted(common, key=lambda j: float(weights[j]), reverse=True)
                matched_terms_by_idx[i] = [str(feature_names[j]) for j in common_sorted[:8]]
            else:
                dt = _token_set(corpus[i])
                matched_terms_by_idx[i] = sorted(st_tokens & dt)[:8]

    results: List[RecommendResult] = []
    for i in ranked:
        s = req.scholarships[i]
        sc = float(scores[i])
        results.append(
            RecommendResult(
                id=s.id,
                score=sc,
                matchPercent=float(pct_batch[i]),
                matchedTerms=matched_terms_by_idx.get(i) if req.includeMatchedTerms else None,
            )
        )

    return RecommendResponse(results=results)


def _mock_external_scholarships() -> List[Dict[str, Any]]:
    # Safe, offline demo provider. Replace/add real providers later (APIs, RSS, scraping).
    return [
        {
            "title": "DAAD Scholarship",
            "description": "Funding opportunities for international Master and PhD students in Germany in various fields.",
            "country": "Germany",
            "degreeLevel": "master",
            "fieldOfStudy": "Computer Science",
            "deadline": "2026-11-20",
            "sourceName": "MockProvider",
            "sourceUrl": "https://example.com/daad",
        },
        {
            "title": "Erasmus Mundus Joint Masters",
            "description": "Fully funded joint Master's programmes offered by a consortium of universities across Europe.",
            "country": "Europe",
            "degreeLevel": "master",
            "fieldOfStudy": "Engineering",
            "deadline": "2026-01-10",
            "sourceName": "MockProvider",
            "sourceUrl": "https://example.com/erasmus",
        },
        {
            "title": "Chevening Scholarship",
            "description": "UK government scholarship for future leaders to pursue a one-year Master's in the United Kingdom.",
            "country": "United Kingdom",
            "degreeLevel": "master",
            "fieldOfStudy": "Public Policy",
            "deadline": "2026-12-01",
            "sourceName": "MockProvider",
            "sourceUrl": "https://example.com/chevening",
        },
    ]


@app.post("/ai/discover", response_model=DiscoverResponse)
def discover(req: DiscoverRequest):
    query = _student_query_from_profile(req.student)

    providers = list(req.providers or [])
    if not providers:
        providers = ["rss"] if req.rss_feed_urls else ["mock"]
    raw: List[Dict[str, Any]] = []
    if "rss" in providers and req.rss_feed_urls:
        rss_urls = req.rss_feed_urls[:15]
        if rss_urls:
            max_w = min(6, len(rss_urls))
            with ThreadPoolExecutor(max_workers=max_w) as pool:
                futs = [pool.submit(_fetch_one_feed_safe, u) for u in rss_urls]
                for fut in as_completed(futs):
                    rows, _err = fut.result()
                    raw.extend(rows)
    if "mock" in providers:
        raw.extend(_mock_external_scholarships())

    # De-dup by sourceUrl (best-effort)
    seen = set()
    deduped = []
    for r in raw:
        k = (r.get("sourceUrl") or "").strip().lower()
        if not k or k in seen:
            continue
        seen.add(k)
        deduped.append(r)

    # Rank by TF‑IDF between query and title+description
    items = [
        ScholarshipIn(
            id=str(i),
            title=str(r.get("title") or ""),
            description=str(r.get("description") or ""),
            meta=r,
        )
        for i, r in enumerate(deduped)
        if str(r.get("title") or "").strip() or str(r.get("description") or "").strip()
    ]
    if not items:
        return DiscoverResponse(query=query, results=[])

    rec = recommend(
        RecommendRequest(
            student=StudentIn(id=None, text=query),
            scholarships=items,
            topN=min(req.topN, len(items)),
            includeMatchedTerms=True,
        )
    )

    by_id = {s.id: s for s in items}
    results: List[DiscoveredScholarship] = []
    for row in rec.results:
        s = by_id.get(row.id)
        if not s:
            continue
        m = s.meta or {}
        results.append(
            DiscoveredScholarship(
                title=str(m.get("title") or s.title or ""),
                description=str(m.get("description") or s.description or ""),
                country=m.get("country"),
                degreeLevel=m.get("degreeLevel"),
                fieldOfStudy=m.get("fieldOfStudy"),
                deadline=m.get("deadline"),
                sourceName=str(m.get("sourceName") or "Unknown"),
                sourceUrl=str(m.get("sourceUrl") or ""),
                confidence=float(row.score),
                matchPercent=row.matchPercent,
                matchedTerms=row.matchedTerms or [],
            )
        )

    return DiscoverResponse(query=query, results=results)

