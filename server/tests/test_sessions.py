import os
import pytest
from unittest.mock import MagicMock
from fastapi import FastAPI
from fastapi.testclient import TestClient
from uuid import uuid4
from datetime import datetime
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

os.environ["DATABASE_URL"] = "postgresql://user:password@localhost/test_db"
from api.sessions import router, DBSession, Transcript, get_db

# --- Fixtures ---

@pytest.fixture
def mock_db_session():
    """
    Creates a MagicMock that mimics a SQLAlchemy Session.
    """
    session = MagicMock()
    return session

@pytest.fixture
def client(mock_db_session):
    """
    Creates a TestClient with the 'get_db' dependency overridden 
    to return our mock_db_session.
    """
    app = FastAPI()
    app.include_router(router)

    def override_get_db():
        try:
            yield mock_db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    return TestClient(app)

# --- Helpers to create fake data objects ---

def create_fake_session_model():
    """Create a fake database session object with attributes expected by the router."""
    session_id = uuid4()
    mock_obj = MagicMock()
    mock_obj.id = session_id
    mock_obj.created_at = datetime.now()
    mock_obj.ended_at = datetime.now()
    mock_obj.status = "completed"
    
    # Metrics
    mock_obj.total_duration_seconds = 120.5
    mock_obj.word_count = 500
    mock_obj.audio_duration_seconds = 115.0
    mock_obj.processing_time_ms = 2000
    
    return mock_obj

def create_fake_transcript_model(session_id, text="Hello world"):
    """Create a fake database transcript object."""
    mock_obj = MagicMock()
    mock_obj.session_id = session_id
    mock_obj.text = text
    mock_obj.timestamp_start = 0.0
    mock_obj.timestamp_end = 10.0
    mock_obj.created_at = datetime.now()
    return mock_obj

# --- Tests ---

def test_get_sessions_success(client, mock_db_session):
    """
    Test GET /sessions returning a list of sessions with previews.
    """
    # 1. Setup Fake Data
    fake_session_1 = create_fake_session_model()
    fake_session_2 = create_fake_session_model()
    fake_transcript_1 = create_fake_transcript_model(fake_session_1.id, "Preview text one")
    
    # 2. Configure Mocks for db.query()
    
    # Create distinct mock query objects for the chains
    mock_session_query = MagicMock()
    mock_transcript_query = MagicMock()
    
    def query_side_effect(model):
        if model == DBSession:
            return mock_session_query
        elif model == Transcript:
            return mock_transcript_query
        return MagicMock()
    
    mock_db_session.query.side_effect = query_side_effect
    
    mock_session_query.count.return_value = 2
    mock_session_query.order_by.return_value.limit.return_value.offset.return_value.all.return_value = [
        fake_session_1, fake_session_2
    ]
    
    mock_transcript_query.filter.return_value.order_by.return_value.first.side_effect = [
        fake_transcript_1, # Call for session 1
        None               # Call for session 2 (no transcript)
    ]

    # 3. Execution
    response = client.get("/sessions")

    # 4. Assertions
    assert response.status_code == 200
    data = response.json()
    
    # Validate structure matches SessionListResponse
    assert "sessions" in data
    assert "pagination" in data
    assert len(data["sessions"]) == 2
    
    # Check Session 1 (has transcript)
    s1 = data["sessions"][0]
    assert s1["id"] == str(fake_session_1.id)
    assert s1["preview"] == "Preview text one..."
    
    # Check Session 2 (no transcript)
    s2 = data["sessions"][1]
    assert s2["id"] == str(fake_session_2.id)
    assert s2["preview"] is None

    # Verify DB interactions
    assert mock_db_session.query.call_count >= 1

def test_get_session_detail_success(client, mock_db_session):
    """
    Test GET /sessions/{id} returning full details and transcript.
    """
    # 1. Setup Fake Data
    fake_session = create_fake_session_model()
    fake_transcript = create_fake_transcript_model(fake_session.id, "Full transcript text here.")
    
    mock_session_query = MagicMock()
    mock_transcript_query = MagicMock()
    
    mock_db_session.query.side_effect = lambda model: \
        mock_session_query if model == DBSession else mock_transcript_query

    # Configure finding the session
    mock_session_query.filter.return_value.first.return_value = fake_session
    
    # Configure finding the transcript
    mock_transcript_query.filter.return_value.order_by.return_value.first.return_value = fake_transcript

    # 2. Execution
    response = client.get(f"/sessions/{fake_session.id}")

    # 3. Assertions
    assert response.status_code == 200
    data = response.json()
    
    assert data["session"]["id"] == str(fake_session.id)
    assert data["transcript"]["full_text"] == "Full transcript text here."
    assert len(data["transcript"]["segments"]) == 1
    assert data["transcript"]["segments"][0]["text"] == "Full transcript text here."

def test_get_session_not_found(client, mock_db_session):
    """
    Test GET /sessions/{id} when session does not exist.
    """
    mock_session_query = MagicMock()
    mock_db_session.query.return_value = mock_session_query
    
    # Configure session query to return None
    mock_session_query.filter.return_value.first.return_value = None

    response = client.get(f"/sessions/{uuid4()}")

    assert response.status_code == 404
    assert response.json()["detail"] == "Session not found"

def test_delete_session_success(client, mock_db_session):
    """
    Test DELETE /sessions/{id} successfully deletes and commits.
    """
    fake_session = create_fake_session_model()
    
    mock_session_query = MagicMock()
    mock_db_session.query.return_value = mock_session_query
    
    # Simulate finding the session
    mock_session_query.filter.return_value.first.return_value = fake_session

    # Execute
    response = client.delete(f"/sessions/{fake_session.id}")

    # Assert
    assert response.status_code == 200
    assert response.json() == {"message": "Session deleted successfully"}
    
    # Verify delete and commit were called
    mock_db_session.delete.assert_called_once_with(fake_session)
    mock_db_session.commit.assert_called_once()

def test_delete_session_not_found(client, mock_db_session):
    """
    Test DELETE /sessions/{id} returns 404 if not found.
    """
    mock_session_query = MagicMock()
    mock_db_session.query.return_value = mock_session_query
    
    # Simulate session not found
    mock_session_query.filter.return_value.first.return_value = None

    response = client.delete(f"/sessions/{uuid4()}")

    assert response.status_code == 404
    mock_db_session.delete.assert_not_called()
    mock_db_session.commit.assert_not_called()