from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from database import get_db
from models import Session as DBSession, Transcript
from schemas import SessionListResponse, SessionDetailResponse, SessionResponse, SessionInformation
from typing import Optional
from uuid import UUID

router = APIRouter()

@router.get("/sessions", response_model=SessionListResponse)
def get_sessions():
    """Get all transcription sessions"""
    return {"message": "Fetching Sessions", "status": "OK"}

@router.get("/sessions/{session_id}", response_model=SessionDetailResponse)
def get_session(session_id: UUID, db: Session = Depends(get_db)):
    """Get specific session with full transcript"""
    return {"message": "fetch specific session"}