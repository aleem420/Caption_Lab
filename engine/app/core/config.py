from pathlib import Path
import os
import secrets

class Settings:
    APP_NAME: str = os.getenv("CAPTIONLAB_APP_NAME", "CaptionLab Engine")
    VERSION: str = "1.2.0"
    HOST: str = os.getenv("CAPTIONLAB_HOST", "127.0.0.1")
    PORT: int = int(os.getenv("CAPTIONLAB_PORT", "8765"))
    
    # Base paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    DATA_DIR: Path = BASE_DIR / "data"
    MODELS_DIR: Path = BASE_DIR / "models_cache"
    AUDIO_CACHE_DIR: Path = BASE_DIR / "audio_cache"
    RENDERS_DIR: Path = BASE_DIR / "renders"
    DB_PATH: Path = DATA_DIR / "captionlab.db"
    
    # Session Token Security (PRD Section 19.3)
    SESSION_TOKEN: str = os.getenv("CAPTIONLAB_SESSION_TOKEN", secrets.token_urlsafe(32))
    
    # Phase 2 Decision: Factory-default transcription model is 'small'; 'base' is Fast Mode
    DEFAULT_WHISPER_MODEL: str = os.getenv("CAPTIONLAB_DEFAULT_WHISPER_MODEL", "small")
    DEFAULT_LANGUAGE: str = os.getenv("CAPTIONLAB_DEFAULT_LANGUAGE", "hindi_mixed")

settings = Settings()

# Ensure directories exist
for folder in [settings.DATA_DIR, settings.MODELS_DIR, settings.AUDIO_CACHE_DIR, settings.RENDERS_DIR]:
    folder.mkdir(parents=True, exist_ok=True)
