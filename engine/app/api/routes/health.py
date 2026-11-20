import shutil
from fastapi import APIRouter
from app.core.config import settings
from app.services.transcription import transcription_service

router = APIRouter(prefix="/health", tags=["Health"])

@router.get("/")
def get_health():
    """
    Returns engine status, hardware acceleration info, and local models.
    """
    ffmpeg_available = shutil.which("ffmpeg") is not None
    
    # Check GPU capability & device name
    gpu_available = False
    gpu_name = None
    try:
        import torch
        gpu_available = torch.cuda.is_available()
        if gpu_available:
            gpu_name = torch.cuda.get_device_name(0)
    except Exception:
        pass

    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "version": settings.VERSION,
        "session_token": settings.SESSION_TOKEN,
        "device": "cuda" if gpu_available else "cpu",
        "gpu_available": gpu_available,
        "gpu_name": gpu_name or "CPU Only",
        "ffmpeg_available": ffmpeg_available,
        "default_model": settings.DEFAULT_WHISPER_MODEL,
        "default_language": settings.DEFAULT_LANGUAGE,
        "models": transcription_service.get_model_catalog()
    }
