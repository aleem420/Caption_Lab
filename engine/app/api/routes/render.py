from fastapi import APIRouter, HTTPException
from pathlib import Path
from typing import Dict, Any, List
from app.models.schemas import ExportRequest, CaptionModel
from app.services.export_service import ExportService
from app.services.caption_layout import layout_engine
from app.core.config import settings

router = APIRouter(prefix="/render", tags=["Render & Export"])

@router.post("/export")
def export_captions(request: ExportRequest) -> Dict[str, Any]:
    """
    Exports Native Subtitles (SRT, WebVTT) or Transparent ProRes 4444 MOV with Alpha (PRD Section 16).
    """
    output_dir = Path(request.output_directory) if request.output_directory else settings.RENDERS_DIR
    output_dir.mkdir(parents=True, exist_ok=True)
    
    results = {}
    
    if request.output_type in ["srt", "both"]:
        srt_path = output_dir / f"{request.filename_prefix}.srt"
        ExportService.generate_srt(request.captions, srt_path)
        results["srt_path"] = str(srt_path.resolve())
        
    if request.output_type in ["vtt", "both"]:
        vtt_path = output_dir / f"{request.filename_prefix}.vtt"
        ExportService.generate_vtt(request.captions, vtt_path)
        results["vtt_path"] = str(vtt_path.resolve())
        
    if request.output_type in ["prores_4444", "both"]:
        mov_path = output_dir / f"{request.filename_prefix}_transparent.mov"
        ExportService.render_transparent_prores_mov(request, mov_path)
        results["mov_path"] = str(mov_path.resolve())
        
    return {
        "status": "success",
        "output_type": request.output_type,
        "files": results
    }

@router.post("/layout/auto-group", response_model=List[CaptionModel])
def auto_group_captions(
    words: list,
    layout_family: str = "balanced_two_line",
    fps: float = 30.0
):
    """
    Groups words into captions using reading rate, pauses, and visual balance.
    """
    from app.models.schemas import WordModel
    parsed_words = [WordModel(**w) for w in words]
    return layout_engine.group_words_into_captions(
        words=parsed_words,
        layout_family=layout_family,
        fps=fps
    )
