from __future__ import annotations

from fastapi import APIRouter

from app.api.chat_schemas import ChatQueryRequest, ChatResponse
from app.api.chat_service import ChatbotService

router = APIRouter(prefix="/ai/chat", tags=["chatbot"])
service = ChatbotService()


@router.post("/query", response_model=ChatResponse)
def query_chat(req: ChatQueryRequest):
    return service.query(req)

