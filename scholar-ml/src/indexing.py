"""
Milestone 5 helpers: embedding and FAISS index building.
"""
from __future__ import annotations

from typing import Any

import faiss
import numpy as np
from sentence_transformers import SentenceTransformer


def load_embedder(model_name: str) -> SentenceTransformer:
    return SentenceTransformer(model_name)


def encode_texts(
    model: SentenceTransformer,
    texts: list[str],
    batch_size: int = 64,
) -> np.ndarray:
    vectors = model.encode(
        texts,
        batch_size=batch_size,
        show_progress_bar=len(texts) > 100,
        convert_to_numpy=True,
        normalize_embeddings=True,
    )
    if vectors.dtype != np.float32:
        vectors = vectors.astype(np.float32)
    return vectors


def build_faiss_index(vectors: np.ndarray) -> faiss.Index:
    if vectors.ndim != 2 or vectors.shape[0] == 0:
        raise ValueError("vectors must be a non-empty 2D array")
    dim = int(vectors.shape[1])
    index = faiss.IndexFlatIP(dim)
    index.add(vectors)
    return index


def meta_from_chunk(chunk: dict[str, Any]) -> dict[str, Any]:
    return {
        "chunk_id": chunk.get("chunk_id"),
        "scholarship_id": chunk.get("scholarship_id"),
        "chunk_index": chunk.get("chunk_index"),
        "chunk_text": chunk.get("chunk_text"),
        "title": chunk.get("title"),
        "url": chunk.get("url"),
        "source_type": chunk.get("source_type"),
        "country": chunk.get("country"),
        "degree_level": chunk.get("degree_level"),
        "field_of_study": chunk.get("field_of_study"),
        "funding_type": chunk.get("funding_type"),
        "deadline": chunk.get("deadline"),
        "status": chunk.get("status"),
    }
