from __future__ import annotations

from typing import List, Dict, Any, Optional

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer


def scholarship_to_text(row: Dict[str, Any]) -> str:
    return " | ".join(
        [
            str(row.get("name") or ""),
            str(row.get("country") or ""),
            str(row.get("field") or ""),
            str(row.get("level") or ""),
            str(row.get("funding_type") or ""),
            str(row.get("deadline") or ""),
            str(row.get("eligibility") or ""),
        ]
    ).strip()


class EmbeddingService:
    def __init__(
        self,
        model_name: str = "sentence-transformers/all-MiniLM-L6-v2",
        use_sentence_transformers: bool = True,
    ) -> None:
        self.model_name = model_name
        self._use_sentence_transformers = use_sentence_transformers
        self._sbert_model = None
        self._vectorizer: Optional[TfidfVectorizer] = None
        self._mode: str = "tfidf"

    def _ensure_sbert(self) -> None:
        if not self._use_sentence_transformers:
            self._mode = "tfidf"
            return
        if self._sbert_model is not None:
            return
        try:
            from sentence_transformers import SentenceTransformer  # optional dependency

            self._sbert_model = SentenceTransformer(self.model_name)
            self._mode = "sbert"
        except Exception:
            # Fallback to lightweight TF-IDF if sentence-transformers is not available.
            self._mode = "tfidf"

    def fit(self, texts: List[str]) -> None:
        if not texts:
            self._vectorizer = None
            return
        self._ensure_sbert()
        if self._mode == "sbert":
            # SentenceTransformers doesn't require fitting.
            return
        self._vectorizer = TfidfVectorizer(
            lowercase=True,
            stop_words=None,
            ngram_range=(1, 2),
            max_features=5000,
            min_df=1,
            max_df=1.0,
        )
        self._vectorizer.fit(texts)

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []
        self._ensure_sbert()
        if self._mode == "sbert" and self._sbert_model is not None:
            vectors = self._sbert_model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
            return vectors.tolist()

        if self._vectorizer is None:
            # If fit() wasn't called, fit on the fly (best effort).
            self.fit(texts)

        assert self._vectorizer is not None
        mat = self._vectorizer.transform(texts)
        arr = mat.toarray().astype(np.float32)
        # Normalize for cosine similarity via dot product.
        norms = np.linalg.norm(arr, axis=1, keepdims=True)
        norms = np.where(norms == 0, 1.0, norms)
        arr = arr / norms
        return arr.tolist()

