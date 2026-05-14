from __future__ import annotations

import os
import re
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.api.chat_schemas import ChatQueryRequest
from app.data.dataset_loader import load_hybrid_records
from app.models.intent_infer import IntentPredictorProtocol, load_intent_predictor
from app.rag.ranker import filter_by_entities, rank_results
from app.rag.retriever import HybridRetriever
from app.utils.deadline_utils import deadline_meta
from app.utils.entities import extract_entities
from app.utils.eligibility import check_eligibility
from app.utils.chat_profile_merge import build_retrieval_query, merge_profile_into_entities


def _program_name_subcorpus(message: str, records: List[Dict[str, Any]]) -> Optional[List[Dict[str, Any]]]:
    """If the user names a well-known program, search that slice first (message-only)."""
    m = (message or "").lower()
    for kw in ("chevening", "daad", "fulbright", "erasmus", "mext"):
        if kw in m:
            hit = [r for r in records if kw in str(r.get("name") or "").lower()]
            if hit:
                return hit
    return None

def _max_chat_records() -> int:
    try:
        n = int(os.environ.get("SCHOLAR_CHAT_MAX_RECORDS", "500"))
    except ValueError:
        n = 500
    return max(50, min(n, 2000))


def _chat_use_sbert() -> bool:
    return os.environ.get("SCHOLAR_CHAT_SBERT", "").strip().lower() in ("1", "true", "yes", "on")


class ChatbotService:
    def __init__(self) -> None:
        self.artifact_dir = Path("app/models/artifacts")
        self.own_data = Path("app/data/own_scholarships.json")
        self.public_data = Path("app/data/public_scholarships.csv")
        self._predictor: IntentPredictorProtocol | None = None

    @staticmethod
    def _dedupe_recommendations(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        seen: set[tuple[str, str]] = set()
        out: List[Dict[str, Any]] = []
        for r in rows:
            key = (str(r.get("name") or "").strip().lower(), str(r.get("country") or "").strip().lower())
            if key in seen:
                continue
            seen.add(key)
            out.append(r)
        return out

    @staticmethod
    def _quality_trim(
        rows: List[Dict[str, Any]],
        top_k: int,
        *,
        relax: bool = False,
    ) -> List[Dict[str, Any]]:
        if not rows:
            return rows
        if relax or len(rows) <= 5:
            min_sim = 0.015
            min_combined = 0.06
        else:
            min_sim = 0.062
            min_combined = 0.195
        kept = [
            r
            for r in rows
            if float(r.get("similarity") or 0) >= min_sim or float(r.get("score") or 0) >= min_combined
        ]
        if len(kept) >= max(1, min(2, top_k // 2)):
            return kept
        return list(rows)

    def _intent_predictor(self) -> IntentPredictorProtocol | None:
        if self._predictor is not None:
            return self._predictor
        self._predictor = load_intent_predictor(str(self.artifact_dir))
        return self._predictor

    @staticmethod
    def _out_of_scope_payload() -> Dict[str, Any]:
        return {
            "intent": "out_of_scope",
            "recommendations": [],
            "eligibility": (
                "Ask in your own words about scholarships — funding, countries, fields, deadlines, or eligibility.\n\n"
                "Examples (not required):\n"
                "- Fully funded master’s programs in Germany\n"
                "- Am I eligible for DAAD?\n"
                "- When is the Chevening deadline?"
            ),
            "deadlines": [],
        }

    def _records_for_request(self, req: ChatQueryRequest) -> List[Dict[str, Any]]:
        inline_records = [s.model_dump() for s in req.scholarships]
        if req.includePublicDataset:
            merged = load_hybrid_records(str(self.own_data), str(self.public_data))
            return inline_records + merged
        return inline_records

    def _is_in_scope(self, message: str, entities: Dict[str, Any]) -> bool:
        text = (message or "").strip().lower()
        if len(text) < 3:
            return False

        # Basic greeting / filler detection.
        if text in {"hi", "hello", "hey", "hh", "ok", "yo", "test", "none", "non"}:
            return False

        scholarship_keywords = (
            "scholarship",
            "scholarships",
            "funded",
            "funding",
            "grant",
            "grants",
            "bursary",
            "financial aid",
            "tuition",
            "deadline",
            "eligible",
            "eligibility",
            "apply",
            "application",
            "master",
            "bachelor",
            "phd",
            "country",
            "field",
            "study abroad",
        )
        has_keyword = any(k in text for k in scholarship_keywords)
        has_entity = any(
            entities.get(k)
            for k in ("country", "field", "level", "funding_type")
        )
        looks_like_question = bool(re.search(r"\b(what|which|when|how|can i|do i)\b", text))
        return has_keyword or has_entity or looks_like_question

    def query(self, req: ChatQueryRequest) -> Dict[str, Any]:
        entities_from_message = extract_entities(req.message)
        if not self._is_in_scope(req.message, entities_from_message):
            return self._out_of_scope_payload()

        entities = merge_profile_into_entities(entities_from_message, req.profile)

        predictor = self._intent_predictor()
        if predictor:
            intent, _confidence = predictor.predict(req.message)
        else:
            # Safe fallback so API works before training artifacts exist.
            text = req.message.lower()
            if "eligible" in text or "requirement" in text:
                intent = "eligibility_check"
            elif "deadline" in text or "closing" in text:
                intent = "deadline_check"
            else:
                intent = "find_scholarship"

        if intent == "out_of_scope":
            return self._out_of_scope_payload()

        records = self._records_for_request(req)
        cap = _max_chat_records()
        if len(records) > cap:
            records = records[:cap]

        prog = _program_name_subcorpus(req.message, records)
        if prog:
            records = prog

        # Hard country / funding filters must apply to the FULL pool before retrieval.
        # Filtering only the top TF‑IDF hits wrongly returns "no matches" when Spain/Ethiopia
        # rows exist but were not in the first retrieval window.
        restrict = dict(entities_from_message)
        had_restriction = bool(
            restrict.get("country")
            or (restrict.get("funding_type") and restrict.get("strict_funding"))
        )
        corpus = filter_by_entities(records, restrict) if had_restriction else list(records)
        if not corpus and had_restriction:
            return {
                "intent": intent,
                "recommendations": [],
                "eligibility": (
                    "No scholarships matched your country or funding filters in this assistant’s dataset. "
                    "Open Browse Scholarships for the full catalog, or try a slightly broader question."
                ),
                "deadlines": [],
            }

        # Default TF‑IDF: encoding hundreds of rows with SBERT each request is too slow on CPU (proxy timeouts).
        retriever = HybridRetriever(corpus, use_sentence_transformers=_chat_use_sbert())
        retrieval_q = build_retrieval_query(req.message, req.profile)
        raw_candidates = retriever.retrieve(retrieval_q, top_k=max(req.topK * 4, 16))
        filtered = list(raw_candidates)
        ranked = rank_results(filtered, entities)
        ranked = self._dedupe_recommendations(ranked)
        ranked = self._quality_trim(
            ranked,
            req.topK,
            relax=intent in ("eligibility_check", "deadline_check", "compare_scholarships", "application_help"),
        )
        ranked = ranked[: req.topK]

        recommendations = [
            {
                "name": r.get("name"),
                "country": r.get("country"),
                "field": r.get("field"),
                "level": r.get("level"),
                "deadline": r.get("deadline"),
                "funding_type": r.get("funding_type"),
                "score": r.get("score"),
                "semantic": r.get("semantic"),
            }
            for r in ranked
        ]

        eligibility_message = ""
        if intent == "eligibility_check" and ranked:
            profile = req.profile.model_dump() if req.profile else {}
            result = check_eligibility(profile, ranked[0])
            eligibility_message = f"{result['status']}: {' '.join(result['reasons'])}"

        deadlines = []
        for row in sorted(ranked, key=lambda x: x.get("daysLeft") if x.get("daysLeft") is not None else 10**9):
            meta = deadline_meta(row.get("deadline"))
            deadlines.append(
                {
                    "name": row.get("name"),
                    "deadline": row.get("deadline"),
                    "daysLeft": meta.get("daysLeft"),
                    "urgency": meta.get("urgency"),
                }
            )

        return {
            "intent": intent,
            "recommendations": recommendations,
            "eligibility": eligibility_message,
            "deadlines": deadlines,
        }

