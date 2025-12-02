from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from database import get_db
from models import Session as DBSession, Transcript
from schemas import SessionListResponse, SessionDetailResponse, SessionResponse, SessionInformation
from uuid import UUID

router = APIRouter()

@router.get("/sessions", response_model=SessionListResponse)
def get_sessions(
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """Get all transcription sessions"""
    query = db.query(DBSession)
    total = query.count()
    sessions = query.order_by(desc(DBSession.created_at)).limit(limit).offset(offset).all()

    # Add preview to each session
    session_responses = []
    for session in sessions:
        first_transcript = db.query(Transcript).filter(
            Transcript.session_id == session.id
        ).order_by(desc(Transcript.created_at)).first()
        
        preview = first_transcript.text[:100] + "..." if first_transcript else None
        
        session_data = SessionResponse(
            id=session.id,
            created_at=session.created_at,
            ended_at=session.ended_at,
            status=session.status,
            metrics=SessionInformation(
                total_duration_seconds=session.total_duration_seconds,
                word_count=session.word_count,
                audio_duration_seconds=session.audio_duration_seconds,
                processing_time_ms=session.processing_time_ms
            ),
            preview=preview
        )
        session_responses.append(session_data)
    
    return SessionListResponse(
        sessions=session_responses,
        pagination={
            "total": total,
            "limit": limit,
            "offset": offset,
            "has_more": offset + limit < total
        }
    )

@router.get("/sessions/{session_id}", response_model=SessionDetailResponse)
def get_session(session_id: UUID, db: Session = Depends(get_db)):
    """Get specific session with full transcript"""
    session = db.query(DBSession).filter(DBSession.id == session_id).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Get final transcript
    transcript = db.query(Transcript).filter(
        Transcript.session_id == session_id
    ).order_by(desc(Transcript.created_at)).first()
    
    # Create a list of dictionary objects by transforming 
    # transcript records from the database into a JSON-serializable format.
    segments = []
    full_text = ""
    if transcript:
        segments.append({
            "text": transcript.text,
            "timestamp_start": float(transcript.timestamp_start) if transcript.timestamp_start else None,
            "timestamp_end": float(transcript.timestamp_end) if transcript.timestamp_end else None,
        })
        full_text = transcript.text
    
    return SessionDetailResponse(
        session=SessionResponse(
            id=session.id,
            created_at=session.created_at,
            ended_at=session.ended_at,
            status=session.status,
            metrics=SessionInformation(
                total_duration_seconds=session.total_duration_seconds,
                word_count=session.word_count,
                audio_duration_seconds=session.audio_duration_seconds,
                processing_time_ms=session.processing_time_ms
            )
        ),
        transcript={
            "full_text": full_text,
            "segments": segments
        }
    )
