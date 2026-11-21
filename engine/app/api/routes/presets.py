from fastapi import APIRouter, HTTPException, Query, Body
from typing import List, Dict, Any, Optional
from app.models.schemas import PresetModel, FontInfoModel
from app.services.preset_service import preset_service
from app.services.font_service import font_service

router = APIRouter(prefix="/presets", tags=["Presets & Fonts"])

@router.get("/all", response_model=List[Dict[str, Any]])
async def list_presets(category: Optional[str] = Query(None)):
    """Lists all available presets, optionally filtered by category ('style' or 'motion')."""
    return await preset_service.list_presets(category)

@router.get("/fonts", response_model=List[FontInfoModel])
def list_available_fonts():
    """Lists verified local system fonts supporting Devanagari and Latin typography."""
    return font_service.get_available_fonts()

@router.get("/{preset_id}")
async def get_preset(preset_id: str):
    """Retrieves a single preset by ID."""
    preset = await preset_service.get_preset(preset_id)
    if not preset:
        raise HTTPException(status_code=404, detail="Preset not found")
    return preset

@router.post("/save")
async def save_preset(preset: PresetModel):
    """Saves or updates a custom style or motion preset."""
    return await preset_service.save_preset(preset)

@router.delete("/{preset_id}")
async def delete_preset(preset_id: str):
    """Deletes a custom preset by ID."""
    success = await preset_service.delete_preset(preset_id)
    if not success:
        raise HTTPException(status_code=404, detail="Preset not found or could not be deleted")
    return {"status": "deleted", "preset_id": preset_id}

@router.get("/export/{preset_id}")
async def export_preset(preset_id: str):
    """Exports a preset as a JSON string for sharing."""
    json_str = await preset_service.export_preset_json(preset_id)
    if not json_str:
        raise HTTPException(status_code=404, detail="Preset not found")
    return {"preset_id": preset_id, "json": json_str}

@router.post("/import")
async def import_preset(payload: Dict[str, Any] = Body(...)):
    """Imports a preset from JSON string or dict."""
    try:
        import json
        json_content = payload.get("json") or json.dumps(payload)
        return await preset_service.import_preset_json(json_content)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
