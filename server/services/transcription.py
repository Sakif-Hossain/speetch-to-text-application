from faster_whisper import WhisperModel
from database import settings
import numpy as np
import io
import wave
import subprocess
import tempfile
import os

class TranscriptionService:
    def __init__(self):
        self.model = WhisperModel(
            settings.model_size,
            device=settings.model_device,
            compute_type=settings.model_compute_type
        )
    
    def transcribe_speech(self, audio_bytes: bytes):
        """Convert Speech to Text"""
        results = []
        audio_array = self._bytes_to_array(audio_bytes)
        segments, info = self.model.transcribe(
            audio_array,
            beam_size=5,
            language="en"
        )

        for segment in segments:
            results.append({
                "text": segment.text,
                "start": segment.start,
                "end": segment.end
            })

        return results, info
    
    def _bytes_to_array(self, audio_bytes: bytes):
        """Convert audio bytes to numpy array"""
        # Check if data is too small
        if len(audio_bytes) < 100:
            raise ValueError(f"Audio data too small: {len(audio_bytes)} bytes")
        
        try:
            # Read as WAV (now coming from browser in WAV format)
            with io.BytesIO(audio_bytes) as audio_file:
                with wave.open(audio_file, 'rb') as wav_file:
                    audio_data = wav_file.readframes(wav_file.getnframes())
                    audio_array = np.frombuffer(audio_data, dtype=np.int16)
                    # Convert to float32 and normalize
                    audio_array = audio_array.astype(np.float32) / 32768.0
                    return audio_array
        except Exception as e:
            raise Exception(f"Failed to process audio: {str(e)}")

# Global instance
transcription_service = TranscriptionService()