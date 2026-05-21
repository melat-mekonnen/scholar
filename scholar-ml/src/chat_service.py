"""
Milestone 7/8 — Shared retrieve → prompt → Ollama orchestration with intent routing.
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import faiss

from src.chat import (
    build_general_prompt,
    build_mixed_prompt,
    build_scholarship_prompt,
    insufficient_context_answer,
    is_eligibility_question,
    ollama_chat,
)
from src.config import (
    CHAT_CONTEXT_TOP_K,
    CHAT_GENERAL_SUGGESTION_TOP_K,
    EMBEDDING_MODEL,
    INDEX_OUTPUT_FAISS_RELPATH,
    INDEX_OUTPUT_META_RELPATH,
    OLLAMA_CHAT_TIMEOUT_SECONDS,
    OLLAMA_DEFAULT_HOST,
    OLLAMA_DEFAULT_MODEL,
    RETRIEVAL_FILTER_OVERSAMPLE,
)
from src.indexing import load_embedder
from src.intent import ChatMode, classify_intent, is_pure_greeting
from src.eligibility import (
    assess_eligibility_for_rows,
    eligibility_to_dict,
    format_eligibility_for_prompt,
)
from src.profile import fetch_student_profile
from src.retrieve import RetrievalFilters, has_named_scholarship_in_query, retrieve


@dataclass
class ChatResult:
    answer: str
    citations: list[dict[str, Any]]
    used_filters: dict[str, Any]
    retrieved_count: int
    mode: str
    dry_run: bool = False
    eligibility: list[dict[str, Any]] | None = None
    profile_loaded: bool = False


class ChatService:
    """Loads FAISS index + metadata once; reuses embedder across requests."""

    def __init__(
        self,
        index_path: Path | str,
        meta_path: Path | str,
        embedding_model: str = EMBEDDING_MODEL,
        ollama_host: str = OLLAMA_DEFAULT_HOST,
        ollama_model: str = OLLAMA_DEFAULT_MODEL,
        ollama_timeout_seconds: int = OLLAMA_CHAT_TIMEOUT_SECONDS,
        filter_oversample: int = RETRIEVAL_FILTER_OVERSAMPLE,
    ) -> None:
        self.index_path = Path(index_path)
        self.meta_path = Path(meta_path)
        self.embedding_model = embedding_model
        self.ollama_host = ollama_host
        self.ollama_model = ollama_model
        self.ollama_timeout_seconds = ollama_timeout_seconds
        self.filter_oversample = filter_oversample
        self._index: faiss.Index | None = None
        self._meta: list[dict[str, Any]] | None = None
        self._embedder = None

    def index_ready(self) -> bool:
        return self.index_path.is_file() and self.meta_path.is_file()

    def load(self) -> None:
        if not self.index_ready():
            raise FileNotFoundError(
                f"Index artifacts missing. Expected:\n  {self.index_path.resolve()}\n  {self.meta_path.resolve()}"
            )
        self._index = faiss.read_index(str(self.index_path))
        with open(self.meta_path, "r", encoding="utf-8") as f:
            meta = json.load(f)
        if not isinstance(meta, list):
            raise ValueError("chunks_meta.json must be a JSON array")
        self._meta = meta
        self._embedder = load_embedder(self.embedding_model)

    def ensure_loaded(self) -> None:
        if self._index is None or self._meta is None or self._embedder is None:
            self.load()

    @property
    def vector_count(self) -> int:
        self.ensure_loaded()
        assert self._index is not None
        return int(self._index.ntotal)

    def _retrieve(
        self,
        message: str,
        top_k: int,
        filt_obj: RetrievalFilters,
    ) -> list[dict[str, Any]]:
        assert self._index is not None
        assert self._meta is not None
        assert self._embedder is not None
        return retrieve(
            query=message,
            model=self._embedder,
            index=self._index,
            meta=self._meta,
            top_k=top_k,
            filters=filt_obj,
            filter_oversample=self.filter_oversample,
        )

    @staticmethod
    def _citations_from_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
        return [
            {
                "scholarship_id": r.get("scholarship_id"),
                "title": r.get("title"),
                "url": r.get("url"),
                "chunk_id": r.get("chunk_id"),
            }
            for r in rows
        ]

    def chat(
        self,
        message: str,
        *,
        top_k: int = CHAT_CONTEXT_TOP_K,
        filters: dict[str, Any] | None = None,
        user_id: str | None = None,
        dry_run: bool = False,
    ) -> ChatResult:
        self.ensure_loaded()

        filters = filters or {}
        filters_clean = {k: v for k, v in filters.items() if v is not None and str(v).strip()}
        filt_obj = RetrievalFilters.from_dict(filters_clean)

        mode = classify_intent(message, has_filters=bool(filters_clean))
        greeting = is_pure_greeting(message)
        eligibility_q = is_eligibility_question(message)

        profile: dict[str, Any] | None = None
        eligibility_items: list = []
        eligibility_text: str | None = None
        profile_loaded = False

        if user_id and eligibility_q:
            try:
                profile = fetch_student_profile(user_id)
                profile_loaded = profile is not None
            except Exception:
                profile = None
                profile_loaded = False

        retrieved: list[dict[str, Any]] = []
        citations: list[dict[str, Any]] = []

        if mode == ChatMode.GENERAL:
            optional: list[dict[str, Any]] = []
            if not greeting:
                optional = self._retrieve(
                    message,
                    top_k=CHAT_GENERAL_SUGGESTION_TOP_K,
                    filt_obj=filt_obj,
                )
            system_prompt, user_prompt = build_general_prompt(
                message,
                is_greeting=greeting,
                optional_suggestions=optional or None,
            )
        elif mode == ChatMode.MIXED:
            retrieved = self._retrieve(message, top_k=top_k, filt_obj=filt_obj)
            system_prompt, user_prompt = build_mixed_prompt(
                message, retrieved, filters=filters_clean
            )
            citations = self._citations_from_rows(retrieved)
        else:
            retrieved = self._retrieve(message, top_k=top_k, filt_obj=filt_obj)
            if profile and retrieved:
                program_named = has_named_scholarship_in_query(message, self._meta or [])
                eligibility_items = assess_eligibility_for_rows(
                    profile,
                    retrieved,
                    program_named_in_query=program_named,
                )
                eligibility_text = format_eligibility_for_prompt(eligibility_items)
            system_prompt, user_prompt = build_scholarship_prompt(
                message,
                retrieved,
                filters=filters_clean,
                profile=profile,
                eligibility_assessment=eligibility_text,
            )
            citations = self._citations_from_rows(retrieved)

        if dry_run:
            if mode == ChatMode.GENERAL:
                answer = (
                    "Dry run: would answer generally (no scholarship citations)."
                    if greeting
                    else "Dry run: would answer generally; optional scholarship suggestions may be appended."
                )
            elif not retrieved:
                answer = insufficient_context_answer(retrieved)
            else:
                answer = f"Dry run: prompt built successfully (mode={mode.value})."
        else:
            answer = ollama_chat(
                host=self.ollama_host,
                model=self.ollama_model,
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                timeout_seconds=self.ollama_timeout_seconds,
            )
            if not answer:
                answer = (
                    "I'm here to help. Ask me about scholarships, deadlines, or countries you're interested in."
                    if mode == ChatMode.GENERAL
                    else insufficient_context_answer(retrieved)
                )
            elif eligibility_q and user_id and not profile_loaded:
                answer += (
                    "\n\nTo get a personalized eligibility check against your profile, "
                    "complete your student profile in EthioScholar settings."
                )

        return ChatResult(
            answer=answer,
            citations=citations,
            used_filters=filters_clean,
            retrieved_count=len(retrieved),
            mode=mode.value,
            dry_run=dry_run,
            eligibility=eligibility_to_dict(eligibility_items) if eligibility_items else None,
            profile_loaded=profile_loaded,
        )
