from __future__ import annotations

from typing import List, Dict, Any

from app.rag.embeddings import scholarship_to_text, EmbeddingService
from app.rag.faiss_index import build_index, search


class HybridRetriever:
    def __init__(
        self,
        records: List[Dict[str, Any]],
        *,
        use_sentence_transformers: bool = False,
    ) -> None:
        self.records = records
        self.embedding = EmbeddingService(use_sentence_transformers=use_sentence_transformers)
        self.texts = [scholarship_to_text(r) for r in records]
        if self.texts:
            # Fit embeddings once on the corpus.
            self.embedding.fit(self.texts)
            self.vectors = self.embedding.embed_texts(self.texts)
        else:
            self.vectors = []
        self.index = build_index(self.vectors) if self.vectors else None

    def retrieve(self, query: str, top_k: int = 8) -> List[Dict[str, Any]]:
        if self.index is None:
            return []
        query_vec = self.embedding.embed_texts([query])[0]
        scores, indices = search(self.index, query_vec, top_k=top_k)
        out = []
        for score, idx in zip(scores, indices):
            if idx < 0 or idx >= len(self.records):
                continue
            row = dict(self.records[idx])
            row["similarity"] = float(score)
            out.append(row)
        return out

