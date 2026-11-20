import shutil
import platform
import psutil
from pathlib import Path
from fastapi import APIRouter
from app.core.config import settings
from app.services.transcription import transcription_service
from app.core.errors import ERROR_CATALOG

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

@router.get("/diagnostics")
def get_system_diagnostics():
    """
    Detailed diagnostic report for troubleshooting and production certification (Milestone 5 E).
    Never exposes raw tokens, passwords, or private file contents.
    """
    # Calculate disk space on DATA_DIR
    disk_free_gb = 0.0
    try:
        usage = shutil.disk_usage(settings.DATA_DIR)
        disk_free_gb = round(usage.free / (1024 ** 3), 2)
    except Exception:
        pass

    # Memory info
    mem = psutil.virtual_memory()
    ram_total_gb = round(mem.total / (1024 ** 3), 2)
    ram_available_gb = round(mem.available / (1024 ** 3), 2)

    # GPU info
    gpu_info = {"available": False, "device_name": "None", "vram_total_mb": 0}
    try:
        import torch
        if torch.cuda.is_available():
            props = torch.cuda.get_device_properties(0)
            gpu_info = {
                "available": True,
                "device_name": props.name,
                "vram_total_mb": round(props.total_memory / (1024 ** 2), 0),
                "cuda_version": torch.version.cuda
            }
    except Exception:
        pass

    # Models cache disk footprint
    models_cached = []
    if settings.MODELS_DIR.exists():
        for item in settings.MODELS_DIR.iterdir():
            if item.is_dir():
                models_cached.append(item.name)

    # Sanitized masked token
    token = settings.SESSION_TOKEN
    masked_token = f"••••••••{token[-6:]}" if len(token) > 8 else "••••••••"

    return {
        "captionlab_version": settings.VERSION,
        "environment": {
            "platform": platform.platform(),
            "python_version": platform.python_version(),
            "cpu_count": psutil.cpu_count(logical=True),
            "ram_total_gb": ram_total_gb,
            "ram_available_gb": ram_available_gb,
            "disk_free_gb": disk_free_gb,
        },
        "hardware_acceleration": gpu_info,
        "ffmpeg_available": shutil.which("ffmpeg") is not None,
        "ffmpeg_path": shutil.which("ffmpeg"),
        "models_cached_locally": models_cached,
        "error_catalog_version": "1.2.0",
        "error_codes_count": len(ERROR_CATALOG),
        "security": {
            "loopback_bound": True,
            "token_masked": masked_token
        }
    }
