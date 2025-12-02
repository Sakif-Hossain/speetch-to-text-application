from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
from uuid import UUID
from decimal import Decimal

class TranscriptSegment(BaseModel):
    text: str
    timestamp_start: Optional[Decimal]
    timestamp_end: Optional[Decimal]
    
    class Config:
        from_attributes = True

class SessionInformation(BaseModel):
    total_duration_seconds: Optional[Decimal]
    word_count: int
    audio_duration_seconds: Optional[Decimal]
    processing_time_ms: Optional[int]

class SessionResponse(BaseModel):
    id: UUID
    created_at: datetime
    ended_at: Optional[datetime]
    status: str
    metrics: SessionInformation
    preview: Optional[str] = None
    
    class Config:
        from_attributes = True

class SessionDetailResponse(BaseModel):
    session: SessionResponse
    transcript: dict  # Contains full_text and segments

class SessionListResponse(BaseModel):
    sessions: List[SessionResponse]
    pagination: dict
