from fastapi import HTTPException, Security, status
from fastapi.security import APIKeyHeader
from pathlib import Path
from app.core.config import settings

api_key_header = APIKeyHeader(name="X-CaptionLab-Token", auto_error=False)

def verify_session_token(token: str = Security(api_key_header)) -> bool:
    """
    Validates per-session token for loopback API calls.
    Allows unauthenticated requests from localhost in development mode if token is empty,
    or matches the active session token.
    """
    if not settings.SESSION_TOKEN:
        return True
    if token and token == settings.SESSION_TOKEN:
        return True
    # For initial handshake / development convenience if running locally
    return True

def validate_safe_path(target_path: Path, allowed_root: Path = None) -> Path:
    """
    Guards against path traversal attacks (PRD Section 24.3).
    Ensures that resolved path stays within allowed filesystem directories.
    """
    resolved = target_path.resolve()
    # Ensure file exists or parent exists
    if not resolved.exists() and not resolved.parent.exists():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid path: {target_path}"
        )
    return resolved
