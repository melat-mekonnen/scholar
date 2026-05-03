from __future__ import annotations

import re
from pathlib import Path
from typing import List, Dict, Any

from app.api.chat_schemas import ChatQueryRequest
from app.data.dataset_loader import load_hybrid_records
from app.models.intent_infer import IntentPredictor
from app.rag.ranker import rank_results
from app.rag.retriever import HybridRetriever
from app.utils.deadline_utils import deadline_meta
from app.utils.entities import extract_entities
from app.utils.eligibility import check_eligibility


class ChatbotService:
    def __init__(self) -> None:
        self.artifact_dir = Path("app/models/artifacts")
        self.own_data = Path("app/data/own_scholarships.json")
        self.public_data = Path("app/data/public_scholarships.csv")
        self._predictor = None

    def _intent_predictor(self) -> IntentPredictor | None:
        if self._predictor:
            return self._predictor
        model_file = self.artifact_dir / "intent_model.pt"
        if not model_file.exists():
            return None
        self._predictor = IntentPredictor(str(self.artifact_dir))
        return self._predictor

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
            "funded",
            "funding",
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
        )
        has_keyword = any(k in text for k in scholarship_keywords)
        has_entity = any(
            entities.get(k)
            for k in ("country", "field", "level", "funding_type")
        )
        looks_like_question = bool(re.search(r"\b(what|which|when|how|can i|do i)\b", text))
        return has_keyword or has_entity or looks_like_question

    def query(self, req: ChatQueryRequest) -> Dict[str, Any]:
        entities = extract_entities(req.message)
        if not self._is_in_scope(req.message, entities):
            return {
                "intent": "out_of_scope",
                "recommendations": [],
                "eligibility": (
                    "Please ask scholarship-related questions only, such as recommendations, "
                    "eligibility, funding type, or deadlines.\n\n"
                    "Try:\n"
                    "- find fully funded scholarships in Germany\n"
                    "- am I eligible for DAAD?\n"
                    "- deadline for Chevening scholarship"
                ),
                "deadlines": [],
            }

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

        records = self._records_for_request(req)
        retriever = HybridRetriever(records)
        candidates = retriever.retrieve(req.message, top_k=max(req.topK * 3, 12))
        ranked = rank_results(candidates, entities)[: req.topK]

        recommendations = [
            {
                "name": r.get("name"),
                "country": r.get("country"),
                "field": r.get("field"),
                "level": r.get("level"),
                "deadline": r.get("deadline"),
                "funding_type": r.get("funding_type"),
                "score": r.get("score"),
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

