import sys
import urllib.request
import logging
import uvicorn
from app.core.config import settings
from app.core.logging_config import setup_logging
from app.core.mutex import WindowsNamedMutex

logger = logging.getLogger("captionlab.runner")

def check_existing_instance_health(host: str, port: int) -> bool:
    """
    Sends a fast loopback health check ping to determine if an existing
    engine instance is active and responsive on the expected port.
    """
    url = f"http://{host}:{port}/health/"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "CaptionLab-SelfCheck/1.0"})
        with urllib.request.urlopen(req, timeout=2.0) as response:
            return response.status == 200
    except Exception:
        return False

def main():
    setup_logging()
    
    # Workstream D: Acquire Windows single-instance mutex
    mutex = WindowsNamedMutex()
    if not mutex.acquire():
        logger.warning("Another CaptionLab engine instance holds the application mutex.")
        # Probe existing instance on port
        if check_existing_instance_health(settings.HOST, settings.PORT):
            print(f"[CaptionLab] Another engine instance is already running and healthy on {settings.HOST}:{settings.PORT}.")
            print(f"[CaptionLab] Exiting second launch cleanly without conflict.")
            sys.exit(0)
        else:
            print(f"[CaptionLab WARNING] Mutex is held, but {settings.HOST}:{settings.PORT} is not responding.")
            print(f"[CaptionLab WARNING] An existing engine process may be initializing or terminating.")
            sys.exit(0)

    # Mask token for console output
    token = settings.SESSION_TOKEN
    masked_token = f"••••••••{token[-6:]}" if len(token) > 8 else "••••••••"

    print(f"==================================================")
    print(f"  {settings.APP_NAME} v{settings.VERSION}")
    print(f"  Words into Motion. Local-First Engine.")
    print(f"  Loopback host: {settings.HOST}:{settings.PORT}")
    print(f"  Session Token: {masked_token}")
    print(f"  Data Directory: {settings.DATA_DIR}")
    print(f"==================================================")

    try:
        uvicorn.run(
            "app.main:app",
            host=settings.HOST,
            port=settings.PORT,
            reload=False,
            log_level="info"
        )
    finally:
        mutex.release()

if __name__ == "__main__":
    main()
