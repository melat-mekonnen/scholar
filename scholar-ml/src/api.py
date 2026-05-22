"""
Milestone 8 — FastAPI orchestration for Scholar-ML RAG chatbot.
"""
from __future__ import annotations

import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from src.chat_service import ChatService
from src.config import (
    API_DEFAULT_HOST,
    API_DEFAULT_PORT,
    API_MAX_REQUEST_BYTES,
    API_VERSION,
    CHAT_CONTEXT_TOP_K,
    CHAT_MAX_MESSAGE_CHARS,
    EMBEDDING_MODEL,
    INDEX_OUTPUT_FAISS_RELPATH,
    INDEX_OUTPUT_META_RELPATH,
    OLLAMA_CHAT_TIMEOUT_SECONDS,
    OLLAMA_DEFAULT_HOST,
    OLLAMA_DEFAULT_MODEL,
)

ROOT = Path(__file__).resolve().parents[1]


class ChatFilters(BaseModel):
    country: str | None = None
    degree_level: str | None = None
    funding_type: str | None = None
    field: str | None = None


class ProfileFieldMatch(BaseModel):
    profile_field: str
    profile_value: str | None = None
    scholarship_field: str
    scholarship_value: str | None = None
    status: str
    detail: str


class ScholarshipEligibility(BaseModel):
    scholarship_id: str | None = None
    title: str | None = None
    overall: str
    matches: list[ProfileFieldMatch]


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=CHAT_MAX_MESSAGE_CHARS)
    conversation_id: str | None = None  # reserved for Milestone 9
    user_id: str | None = None
    filters: ChatFilters | None = None
    dry_run: bool = False


class Citation(BaseModel):
    scholarship_id: str | None = None
    title: str | None = None
    url: str | None = None
    chunk_id: str | None = None


class ChatResponse(BaseModel):
    answer: str
    citations: list[Citation]
    mode: str = "scholarship"
    eligibility: list[ScholarshipEligibility] | None = None
    profile_loaded: bool = False


def _resolve_artifact_path(env_key: str, default_relpath: str) -> Path:
    raw = os.environ.get(env_key, "").strip()
    if raw:
        path = Path(raw)
        if not path.is_absolute():
            path = ROOT / path
    else:
        path = ROOT / default_relpath
    return path.resolve()


def _service_paths() -> tuple[Path, Path]:
    index = _resolve_artifact_path("SCHOLAR_ML_INDEX_PATH", INDEX_OUTPUT_FAISS_RELPATH)
    meta = _resolve_artifact_path("SCHOLAR_ML_META_PATH", INDEX_OUTPUT_META_RELPATH)
    default_index = (ROOT / INDEX_OUTPUT_FAISS_RELPATH).resolve()
    default_meta = (ROOT / INDEX_OUTPUT_META_RELPATH).resolve()
    if not index.is_file() and default_index.is_file():
        index = default_index
    if not meta.is_file() and default_meta.is_file():
        meta = default_meta
    return index, meta


def create_chat_service() -> ChatService:
    index_path, meta_path = _service_paths()
    return ChatService(
        index_path=index_path,
        meta_path=meta_path,
        embedding_model=os.environ.get("SCHOLAR_ML_EMBEDDING_MODEL", EMBEDDING_MODEL),
        ollama_host=os.environ.get("OLLAMA_HOST", OLLAMA_DEFAULT_HOST),
        ollama_model=os.environ.get("OLLAMA_MODEL", OLLAMA_DEFAULT_MODEL),
        ollama_timeout_seconds=int(
            os.environ.get("OLLAMA_CHAT_TIMEOUT_SECONDS", OLLAMA_CHAT_TIMEOUT_SECONDS)
        ),
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.chat_service = create_chat_service()
    service: ChatService = app.state.chat_service
    if service.index_ready():
        try:
            service.load()
        except Exception as e:
            print(f"WARN: could not preload index: {e}", flush=True)
    yield


app = FastAPI(title="Scholar-ML RAG Chatbot", version=API_VERSION, lifespan=lifespan)


def get_chat_service() -> ChatService:
    """Return app chat service; lazy-init when TestClient skips lifespan."""
    if not hasattr(app.state, "chat_service") or app.state.chat_service is None:
        app.state.chat_service = create_chat_service()
        svc: ChatService = app.state.chat_service
        if svc.index_ready():
            try:
                svc.load()
            except Exception as e:
                print(f"WARN: could not load index: {e}", flush=True)
    return app.state.chat_service


@app.middleware("http")
async def limit_request_size(request: Request, call_next):
    if request.method == "POST":
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > API_MAX_REQUEST_BYTES:
            return JSONResponse(
                status_code=413,
                content={"detail": f"Request body too large (max {API_MAX_REQUEST_BYTES} bytes)"},
            )
    return await call_next(request)


@app.get("/health")
def health():
    service = get_chat_service()
    ready = service.index_ready()
    loaded = service._index is not None  # noqa: SLF001 — health introspection
    return {
        "status": "ok" if ready else "degraded",
        "index_file_present": ready,
        "index_loaded": loaded,
        "vector_count": service.vector_count if loaded else 0,
    }


@app.get("/v1/version")
def version():
    return {
        "service": "scholar-ml",
        "version": API_VERSION,
        "embedding_model": os.environ.get("SCHOLAR_ML_EMBEDDING_MODEL", EMBEDDING_MODEL),
        "ollama_model": os.environ.get("OLLAMA_MODEL", OLLAMA_DEFAULT_MODEL),
    }


@app.post("/v1/chat", response_model=ChatResponse)
def chat_v1(body: ChatRequest):
    service = get_chat_service()
    if not service.index_ready():
        raise HTTPException(
            status_code=503,
            detail="Search index not available. Run export pipeline and `python -m scripts.build_index`.",
        )

    filters_dict: dict[str, Any] = {}
    if body.filters:
        filters_dict = body.filters.model_dump(exclude_none=True)

    try:
        result = service.chat(
            body.message,
            top_k=int(os.environ.get("SCHOLAR_ML_CHAT_TOP_K", CHAT_CONTEXT_TOP_K)),
            filters=filters_dict,
            user_id=body.user_id,
            dry_run=body.dry_run,
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except Exception as e:
        if body.dry_run:
            raise HTTPException(status_code=500, detail=str(e)) from e
        raise HTTPException(
            status_code=502,
            detail=f"LLM generation failed: {e}. Ensure Ollama is running (`ollama serve`).",
        ) from e

    return ChatResponse(
        answer=result.answer,
        citations=[Citation(**c) for c in result.citations],
        mode=result.mode,
        eligibility=[ScholarshipEligibility(**e) for e in result.eligibility]
        if result.eligibility
        else None,
        profile_loaded=result.profile_loaded,
    )


def main() -> None:
    import uvicorn

    host = os.environ.get("SCHOLAR_ML_HOST", API_DEFAULT_HOST)
    port = int(os.environ.get("SCHOLAR_ML_PORT", API_DEFAULT_PORT))
    uvicorn.run("src.api:app", host=host, port=port, reload=False)


if __name__ == "__main__":
    main()
