from __future__ import annotations

from pathlib import Path
from typing import List, Tuple, Any

import numpy as np


def build_index(vectors: List[List[float]]) -> Any:
    arr = np.asarray(vectors, dtype=np.float32)
    if arr.ndim != 2:
        raise ValueError("vectors must be 2D")
    try:
        import faiss  # optional dependency

        index = faiss.IndexFlatIP(arr.shape[1])
        index.add(arr)
        return index
    except Exception:
        # Fallback: store dense vectors and do brute-force dot product.
        return arr


def save_index(index: Any, path: str) -> None:
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    # Only supported when FAISS is available.
    if hasattr(index, "ntotal"):
        try:
            import faiss  # type: ignore

            faiss.write_index(index, str(p))
        except Exception:
            # No-op fallback.
            return


def load_index(path: str) -> Any:
    try:
        import faiss  # type: ignore

        return faiss.read_index(path)
    except Exception:
        raise RuntimeError("FAISS is not available to load an index")


def search(index: Any, query_vec: List[float], top_k: int = 5) -> Tuple[List[float], List[int]]:
    q = np.asarray([query_vec], dtype=np.float32)
    if hasattr(index, "search"):
        scores, idx = index.search(q, top_k)
        return scores[0].tolist(), idx[0].tolist()

    # Brute-force fallback.
    vectors = np.asarray(index, dtype=np.float32)  # shape: [N, D]
    sims = (vectors @ q.T).flatten()  # dot product assumes vectors are normalized
    if top_k >= len(sims):
        sorted_idx = np.argsort(sims)[::-1]
    else:
        # Get top-k without full sort, then sort those.
        part = np.argpartition(sims, -top_k)[-top_k:]
        sorted_idx = part[np.argsort(sims[part])[::-1]]
    top_scores = sims[sorted_idx].tolist()
    return top_scores, sorted_idx.tolist()

