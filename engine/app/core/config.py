from pathlib import Path
import os
import sys
import secrets
import tempfile
import logging

logger = logging.getLogger("captionlab.config")

def get_windows_app_data_dir() -> Path:
    """
    Resolves the persistent user data directory for CaptionLab.
    Defaults to %LOCALAPPDATA%\\CaptionLab on Windows.
    Falls back gracefully to USERPROFILE or temp directory if undefined.
    """
    local_app_data = os.environ.get("LOCALAPPDATA")
    if local_app_data:
        return Path(local_app_data) / "CaptionLab"
    user_profile = os.environ.get("USERPROFILE")
    if user_profile:
        return Path(user_profile) / "AppData" / "Local" / "CaptionLab"
    try:
        return Path.home() / "AppData" / "Local" / "CaptionLab"
    except Exception:
        return Path(tempfile.gettempdir()) / "CaptionLab"

def get_windows_temp_dir() -> Path:
    """
    Resolves the temporary cache directory for CaptionLab.
    Defaults to %TEMP%\\CaptionLab on Windows.
    Falls back to standard temp directory.
    """
    temp_dir = os.environ.get("TEMP") or os.environ.get("TMP")
    if temp_dir:
        return Path(temp_dir) / "CaptionLab"
    try:
        return Path(tempfile.gettempdir()) / "CaptionLab"
    except Exception:
        return Path("C:/Windows/Temp/CaptionLab")

class Settings:
    APP_NAME: str = os.getenv("CAPTIONLAB_APP_NAME", "CaptionLab Engine")
    VERSION: str = "1.2.0"
    HOST: str = os.getenv("CAPTIONLAB_HOST", "127.0.0.1")
    PORT: int = int(os.getenv("CAPTIONLAB_PORT", "8765"))
    
    # Base code directory (repository / installation bundle root)
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    
    # Configurable root overrides (used for testing and portable execution)
    APP_DATA_DIR: Path = Path(os.getenv("CAPTIONLAB_DATA_ROOT", str(get_windows_app_data_dir())))
    APP_TEMP_DIR: Path = Path(os.getenv("CAPTIONLAB_TEMP_ROOT", str(get_windows_temp_dir())))
    
    # Persistent User Data (%LOCALAPPDATA%\CaptionLab\)
    DATA_DIR: Path = APP_DATA_DIR / "data"
    MODELS_DIR: Path = APP_DATA_DIR / "models_cache"
    LOGS_DIR: Path = APP_DATA_DIR / "logs"
    BACKUPS_DIR: Path = APP_DATA_DIR / "backups"
    CONFIG_DIR: Path = APP_DATA_DIR / "config"
    DB_PATH: Path = DATA_DIR / "captionlab.db"
    
    # Ephemeral Data (%TEMP%\CaptionLab\)
    AUDIO_CACHE_DIR: Path = APP_TEMP_DIR / "audio_cache"
    RENDERS_DIR: Path = APP_TEMP_DIR / "renders"
    JOBS_DIR: Path = APP_TEMP_DIR / "jobs"
    
    # Session Token Security (PRD Section 19.3 & M6.1)
    SESSION_TOKEN: str = os.getenv("CAPTIONLAB_SESSION_TOKEN", secrets.token_urlsafe(32))
    AUTH_REQUIRED: bool = os.getenv("CAPTIONLAB_AUTH_REQUIRED", "true").lower() in ("true", "1")
    
    # Factory defaults
    DEFAULT_WHISPER_MODEL: str = os.getenv("CAPTIONLAB_DEFAULT_WHISPER_MODEL", "small")
    DEFAULT_LANGUAGE: str = os.getenv("CAPTIONLAB_DEFAULT_LANGUAGE", "hindi_mixed")

    def ensure_directories_exist(self):
        """
        Ensures that all persistent and temporary storage directories exist
        and validates that they are writable.
        """
        required_dirs = [
            self.DATA_DIR,
            self.MODELS_DIR,
            self.LOGS_DIR,
            self.BACKUPS_DIR,
            self.CONFIG_DIR,
            self.AUDIO_CACHE_DIR,
            self.RENDERS_DIR,
            self.JOBS_DIR,
        ]
        for folder in required_dirs:
            try:
                folder.mkdir(parents=True, exist_ok=True)
                # Test writability
                test_file = folder / ".write_test"
                test_file.touch(exist_ok=True)
                test_file.unlink(missing_ok=True)
            except Exception as e:
                raise PermissionError(
                    f"CaptionLab cannot write to required directory '{folder}'. "
                    f"Please verify permissions. Error: {e}"
                )

settings = Settings()
settings.ensure_directories_exist()
