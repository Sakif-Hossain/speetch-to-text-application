from sqlalchemy import Column, String, Integer, Numeric, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from database import Base

class Session(Base):
    __tablename__ = "sessions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    ended_at = Column(DateTime)
    status = Column(String(20), default="active", nullable=False) # Can be active, completed or error
    
    total_duration_seconds = Column(Numeric(10, 2))
    word_count = Column(Integer, default=0)
    audio_duration_seconds = Column(Numeric(10, 2))
    processing_time_ms = Column(Integer)
    
    # Relationship
    transcripts = relationship("Transcript", back_populates="session", cascade="all, delete-orphan")

class Transcript(Base):
    __tablename__ = "transcripts"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False)
    sequence_number = Column(Integer, nullable=False)
    text = Column(Text, nullable=False)
    is_partial = Column(Boolean, default=False, nullable=False)
    timestamp_start = Column(Numeric(10, 3))
    timestamp_end = Column(Numeric(10, 3))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationship
    session = relationship("Session", back_populates="transcripts")