from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List
from app.services.db import db_service

router = APIRouter(prefix="/projects", tags=["Projects"])

@router.post("/save")
async def save_project(payload: Dict[str, Any]):
    project_meta = payload.get("project", {})
    project_id = project_meta.get("id")
    name = project_meta.get("name", "Untitled CaptionLab Project")
    version = project_meta.get("version", "1.2.0")
    
    if not project_id:
        raise HTTPException(status_code=400, detail="Missing project.id in payload")
        
    await db_service.save_project(project_id, name, version, payload)
    return {"status": "saved", "project_id": project_id}

@router.get("/get/{project_id}")
async def get_project(project_id: str):
    data = await db_service.get_project(project_id)
    if not data:
        raise HTTPException(status_code=404, detail="Project not found")
    return data

@router.get("/recent", response_model=List[Dict[str, Any]])
async def list_recent_projects():
    return await db_service.list_recent_projects()
