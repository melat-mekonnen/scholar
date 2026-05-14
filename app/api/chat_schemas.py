from __future__ import annotations

from typing import List, Optional, Dict, Any

from pydantic import BaseModel, Field


class ChatProfile(BaseModel):
    fieldOfStudy: Optional[str] = None
    degreeLevel: Optional[str] = None
    gpa: Optional[float] = None
    interests: Optional[List[str]] = None
    preferredCountry: Optional[str] = None


class ScholarshipRecord(BaseModel):
    name: str
    country: str = ""
    field: str = ""
    deadline: Optional[str] = None
    eligibility: str = ""
    funding_type: str = ""
    level: str = ""


class ChatQueryRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    topK: int = Field(default=5, ge=1, le=20)
    profile: Optional[ChatProfile] = None
    scholarships: List[ScholarshipRecord] = Field(default_factory=list)
    includePublicDataset: bool = True


class ChatResponse(BaseModel):
    intent: str
    recommendations: List[Dict[str, Any]]
    eligibility: str
    deadlines: List[Dict[str, Any]]

