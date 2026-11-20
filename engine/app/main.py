from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.services.db import db_service
from app.api.routes import health, transcribe, render, project

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite database schema
    await db_service.init_db()
    yield

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="CaptionLab Local Processing Engine for Adobe Premiere Pro UXP",
    lifespan=lifespan
)

# CORS configuration: Allow loopback requests from Adobe UXP panel & localhost
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:*",
        "http://localhost:*",
        "https://localhost:*",
        "*" # UXP webviews run in customized origin contexts
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(health.router)
app.include_router(transcribe.router)
app.include_router(render.router)
app.include_router(project.router)

@app.get("/")
def root():
    return {
        "app": settings.APP_NAME,
        "tagline": "Words into Motion",
        "version": settings.VERSION,
        "status": "online"
    }
