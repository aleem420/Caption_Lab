from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from typing import Optional
from pathlib import Path
import shutil
from app.models.schemas import TranscribeRequest, TranscribeResponse
from app.services.transcription import transcription_service
from app.core.config import settings

router = APIRouter(prefix="/transcribe", tags=["Transcription"])

@router.post("/path", response_model=TranscribeResponse)
def transcribe_from_path(request: TranscribeRequest):
    """
    Transcribes audio file directly from local filesystem path (PRD Section 6).
    """
    try:
        return transcription_service.transcribe_audio(
            audio_path=request.audio_path,
            language=request.language,
            model_size=request.model_size,
            device=request.device,
            word_timestamps=request.word_timestamps,
            vad_filter=request.vad_filter
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload", response_model=TranscribeResponse)
async def transcribe_from_upload(
    file: UploadFile = File(...),
    language: str = Form("hi"),
    model_size: str = Form("base"),
    device: str = Form("cpu")
):
    """
    Accepts uploaded audio file from UXP plugin and runs transcription.
    """
    temp_path = settings.AUDIO_CACHE_DIR / file.filename
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        return transcription_service.transcribe_audio(
            audio_path=str(temp_path),
            language=language,
            model_size=model_size,
            device=device,
            word_timestamps=True,
            vad_filter=True
        )
    finally:
        # Keep or cleanup
        pass
