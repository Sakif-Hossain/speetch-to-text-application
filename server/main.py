from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Create Database

app = FastAPI(title="Real Time Transcriber", version="1.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Real Time Transcriber Backend", "status": "running"}

