import shutil
from fastapi import APIRouter
from app.core.config import settings

router = APIRouter(prefix="/health", tags=["Health"])

@router.get("/")
def get_health():
    """
    Returns engine status, environment capabilities, and local resources.
    Used by UXP plugin to verify engine availability.
    """
    ffmpeg_available = shutil.which("ffmpeg") is not None
    
    # Check GPU capability
    gpu_available = False
    try:
        import torch
        gpu_available = torch.cuda.is_available()
    except Exception:
        pass

    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "version": settings.VERSION,
        "session_token": settings.SESSION_TOKEN,
        "device": "cuda" if gpu_available else "cpu",
        "ffmpeg_available": ffmpeg_available,
        "models_cached": [f.name for f in settings.MODELS_DIR.glob("*") if f.is_dir() or f.suffix in [".bin", ".pt"]],
        "default_language": settings.DEFAULT_LANGUAGE
    }
