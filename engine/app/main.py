from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.core.logging_config import setup_logging
from app.core.security import verify_session_token
from app.services.db import db_service
from app.services.migration_service import migration_service
from app.api.routes import health, transcribe, render, project, presets

# Initialize centralized logging
setup_logging()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Workstream A: Safe legacy migration from in-repo storage
    migration_service.run_migration()
    # Initialize SQLite database schema
    await db_service.init_db()
    yield

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="CaptionLab Local Processing Engine for Adobe Premiere Pro UXP",
    lifespan=lifespan
)

# CORS configuration: Allow loopback requests from Adobe UXP panel & localhost clients
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^(https?://(localhost|127\.0\.0\.1)(:\d+)?|tauri://.*|https://tauri\.localhost|plugin://.*|null)$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes with Workstream C session token protection
app.include_router(health.router)  # /health/ is public bootstrap; /health/diagnostics is protected
app.include_router(transcribe.router, dependencies=[Depends(verify_session_token)])
app.include_router(render.router, dependencies=[Depends(verify_session_token)])
app.include_router(project.router, dependencies=[Depends(verify_session_token)])
app.include_router(presets.router, dependencies=[Depends(verify_session_token)])

@app.get("/")
def root():
    return {
        "app": settings.APP_NAME,
        "tagline": "Words into Motion",
        "version": settings.VERSION,
        "status": "online"
    }
