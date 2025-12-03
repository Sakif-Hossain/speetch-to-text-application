# Hi, I'm Sheikh Safwan! 👋

Recent Computing Science graduate specializing in Software Practice, with 8 months of Application Developer experience at Wawanesa Insurance.

# Textify 🎙️

Textify captures your microphone audio in the browser and converts it into text instantly. Every session is fully transcribed and stored, giving you access to detailed metrics like word count, recording duration, and additional analytics.

## Product Demo

[Demo Link](https://youtu.be/UrDBELhlmF4)

## Installation and Execution

**Prerequisites**: Docker + Docker Compose (recommended) or Python 3.11, Node 20, and Postgres.

**Clone the project**

```bash
  git clone https://github.com/Sakif-Hossain/textify
```

**Go to the project directory**

```bash
  cd textify
```

### Quick start (Docker)

```bash
touch server/.env
cat > server/.env <<EOF
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/transcription_db
MODEL_SIZE=tiny
MODEL_DEVICE=cpu
MODEL_COMPUTE_TYPE=int8
docker compose up --build
# Backend: http://localhost:8000 (docs at /docs)
# Frontend: http://localhost:3000
```

### Backend only (local)

```bash
cd server
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5432/transcription_db
uvicorn main:app --reload --port 8000
```

**_Ensure Postgres is running and the DB exists._**

### Frontend only (local)

```bash
cd client
npm install
npm run dev
# NEXT_PUBLIC_API_URL defaults to http://localhost:8000; override in .env.local if needed
```

### Tests

`cd server && pytest` for API layer tests; \
`cd client && npm test` for UI tests.

### Key env vars (server/.env)

- `DATABASE_URL` (required) e.g. `postgresql+psycopg2://postgres:postgres@db:5432/transcription_db`
- `MODEL_SIZE` (optional, default `tiny`),
- `MODEL_DEVICE` (`cpu`),
- `MODEL_COMPUTE_TYPE` (`int8`, `int8_float16`, etc.)

## API Usage (HTTP + WebSocket)

Base URL: `http://localhost:8000`
API Docs: `http://localhost:8000/docs`

- **List sessions**
  ```bash
  curl "http://localhost:8000/api/sessions
  ```
- **Get session detail**
  ```bash
  curl "http://localhost:8000/api/sessions/{session_id}"
  ```
- **Delete a session**
  ```bash
  curl -X DELETE "http://localhost:8000/api/sessions/{session_id}"
  ```
- **Live transcription WebSocket** (`/ws/transcribe`): send mono WAV (16 kHz) byte frames; receive transcript chunks. Example with `websocat`:
  ```bash
  websocat -b ws://localhost:8000/ws/transcribe < sample.wav
  ```
  Messages returned:
  - `{ "type": "transcript", "text": "...", "start": <float>, "end": <float> }`
  - Socket close ends the session and persists the final transcript and metrics.
- **Postman**:
  - Create a WebSocket request to `ws://localhost:8000/ws/transcribe`, set Body → binary, stream WAV chunks.
  - Add REST requests for `GET /api/sessions`, `GET /api/sessions/:id`, `DELETE /api/sessions/:id`.

## Architecture & Design Decisions

- **Frontend (Next.js w/ TS)**:

  - I used Next.js for this application since it was recommended in the product description. However, because the frontend is minimal and essentially a single-page interface, I could have chosen a lighter framework such as Svelte or even Express.js. In fact, a simple setup with vanilla HTML, CSS, and JavaScript would have been more than sufficient and would have resulted in a leaner, more lightweight application.
  - Typescript adds static type checking, better code quality and easier maintability.
  - I used Jest for writing UI tests.

- **Backend (FastAPI)**:

  - FastAPI has great websocket support.
  - WebSocket to send audio data in real time.
  - ORM: SQLAlchemy.
  - Faster-Whisper (tiny model) for transcribing audio.
  - Pytest for unit testing.

- **Database**:

  - PostgreSQL as a relational database.

- **Containerization**

  - Docker + Docker Compose

- **Source Control & CI Pipeline**

  - GitHub for version control.
  - GitHub Actions for running automated tests with each PR and Pull requests.

- **Assumptions**: English language input, mono 16 kHz audio; client and server run on the same LAN/host; previews derived from the latest transcript segment.

## Database Explanation

The database schema is designed to support a scalable, asynchronous audio transcription system. The architecture utilizes a One-to-Many (1:N) relational model between Sessions (metadata) and Transcripts (content data). This design prioritizes data integrity, and read performance for listing operations.

Here is a ER Diagram of the database design:

![ER Diagram](doc/ERDiagram.png "Entity Relationship diagram")

## Notable limitations

While working on the project I faced changes with sending the correct audio type from frontend to backend. The application can be made more scalable, currently I am using a client-server monolithic architecture which can be switched to a microservice architecture for better scalling of users.

## Suggested Future Improvements

- Add authentication and and authorization using JWT token.
- Support multi-language detection.
- Add support ot handle multiple users. Maybe create another table for user and create one to many relation between user and sessions.
- Use kubernetes to handle microservices.
