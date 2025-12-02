from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Session as DBSession, Transcript
from services.transcription import transcription_service
from datetime import datetime
import time
import logging

router = APIRouter()
logging.basicConfig(level=logging.DEBUG)

@router.websocket("/ws/transcribe")
async def transcribe_websocket(websocket: WebSocket, db: Session = Depends(get_db)):
    await websocket.accept()

    db_session = DBSession(status="active")
    db.add(db_session)
    db.commit()
    db.refresh(db_session)

    session_id = db_session.id
    timer_start = time.perf_counter()
    transcript_parts = []
    transcript_start = None
    transcript_end = None

    try:
        while True:
            # receive text frames from the user
            data = await websocket.receive_bytes()
            results, info = transcription_service.transcribe_speech(data)
            
            for result in results:
                transcript_parts.append(result["text"])
                if transcript_start is None:
                    transcript_start = result["start"]
                transcript_end = result["end"]

                # send an acknowledgement with the current chunk
                await websocket.send_json({
                    "type": "transcript",
                    "text": result["text"],
                    "start": result["start"],
                    "end": result["end"]
                })

    except WebSocketDisconnect:
        # client disconnected normally; mark the DB session accordingly
        db_session.status = "completed"
        db_session.ended_at = datetime.utcnow()

        # persist the full transcript once the call finishes
        full_text = " ".join(transcript_parts).strip()
        if full_text:
            transcript = Transcript(
                session_id=session_id,
                text=full_text,
                timestamp_start=transcript_start,
                timestamp_end=transcript_end
            )
            db.add(transcript)
        
        # calculate metrics
        logging.debug(full_text)
        db_session.word_count = len(full_text.split()) if full_text else 0
        if transcript_end is not None:
            logging.debug(transcript_end)
            db_session.audio_duration_seconds = float(transcript_end or 0)
        if db_session.created_at and db_session.ended_at:
            logging.debug(db_session.ended_at - db_session.created_at)
            db_session.total_duration_seconds = (db_session.ended_at - db_session.created_at).total_seconds()
        db_session.processing_time_ms = int((time.perf_counter() - timer_start) * 1000)
        
        db.commit()

    except Exception as e:
        # unexpected error; mark session as errored, close socket
        print(f"WebSocket error: {str(e)}")  # Log the error
        import traceback
        traceback.print_exc()  # Print full traceback
        
        db_session.status = "error"
        db.commit()
        
        # Truncate error message to avoid WebSocket frame size limit
        error_msg = str(e)[:100]
        await websocket.close(code=1011, reason=error_msg)
