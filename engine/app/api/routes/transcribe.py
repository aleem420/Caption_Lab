from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from typing import List, Optional
from pathlib import Path
import shutil
from app.models.schemas import (
    TranscribeRequest,
    TranscribeResponse,
    ModelInfo,
    AudioValidationRequest,
    AudioValidationResponse,
    WhisperModelSize
)
from app.services.transcription import transcription_service
from app.core.config import settings

router = APIRouter(prefix="/transcribe", tags=["Transcription"])

@router.get("/models", response_model=List[ModelInfo])
def list_whisper_models():
    """
    Returns available Whisper models with size, memory requirements and download status.
    (Phase 2 Decision: small is default, base is Fast Mode)
    """
    return transcription_service.get_model_catalog()

@router.post("/validate-source", response_model=AudioValidationResponse)
def validate_audio_source(req: AudioValidationRequest):
    """
    Validates media file accessibility and extracts 16kHz mono audio stream.
    Supports direct imported media and Premiere sequence audio mixdown.
    """
    return transcription_service.validate_and_extract_audio(
        file_path=req.file_path,
        source_type=req.source_type
    )

@router.post("/path", response_model=TranscribeResponse)
def transcribe_from_path(request: TranscribeRequest):
    """
    Transcribes audio file directly from local filesystem path (PRD Section 6).
    Preserves Hindi Devanagari and Latin English words as spoken.
    """
    try:
        return transcription_service.transcribe_audio(
            audio_path=request.audio_path,
            language=request.language,
            model_size=request.model_size,
            device=request.device,
            source_type=request.source_type,
            range_start=request.range_start,
            range_end=request.range_end,
            word_timestamps=request.word_timestamps,
            vad_filter=request.vad_filter,
            vad_threshold=request.vad_threshold
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload", response_model=TranscribeResponse)
async def transcribe_from_upload(
    file: UploadFile = File(...),
    language: str = Form("hindi_mixed"),
    model_size: WhisperModelSize = Form("small"),
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
            source_type="direct_media",
            word_timestamps=True,
            vad_filter=True
        )
    finally:
        pass
