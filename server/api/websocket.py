from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Session as DBSession, Transcript
from services.transcription import transcription_service
from datetime import datetime
import json

router = APIRouter()

@router.websocket("/ws/transcribe")
async def transcribe_websocket(websocket: WebSocket, db: Session = Depends(get_db)):
    await websocket.accept()

    db_session = DBSession(status="active")
    db.add(db_session)
    db.commit()
    db.refresh(db_session)

    session_id = db_session.id
    sequence = 0

    try:
        while True:
            # receive text frames from the user
            data = await websocket.receive_bytes()
            results, info = transcription_service.transcribe_speech(data)
            
            for result in results:
                sequence += 1

                # persist the received chunk as a transcript record
                transcript = Transcript(
                    session_id=session_id,
                    sequence_number=sequence,
                    text=result["text"],
                    is_partial=False,
                    timestamp_start=result["start"],
                    timestamp_end=result["end"]
                )
                db.add(transcript)
                db.commit()

                # send an acknowledgement with the sequence number
                await websocket.send_json({
                    "type": "transcript",
                    "sequence": sequence,
                    "text": result["text"],
                    "start": result["start"],
                    "end": result["end"]
                })

    except WebSocketDisconnect:
        # client disconnected normally; mark the DB session accordingly
        db_session.status = "completed"
        db_session.ended_at = datetime.utcnow()
        
        # calculate metrics
        transcripts = db.query(Transcript).filter(
            Transcript.session_id == session_id,
            Transcript.is_partial == False
        ).all()
        
        total_text = " ".join([t.text for t in transcripts])
        db_session.word_count = len(total_text.split())
        
        if transcripts:
            db_session.audio_duration_seconds = float(transcripts[-1].timestamp_end or 0)
        
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
