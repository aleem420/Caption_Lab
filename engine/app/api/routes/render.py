from fastapi import APIRouter, HTTPException
from pathlib import Path
from typing import Dict, Any, List
from app.models.schemas import ExportRequest, CaptionModel, AutoGroupRequest
from app.services.export_service import ExportService
from app.services.caption_layout import layout_engine
from app.core.config import settings

router = APIRouter(prefix="/render", tags=["Render & Export"])

@router.post("/export")
def export_captions(request: ExportRequest) -> Dict[str, Any]:
    """
    Exports Native Subtitles (SRT, WebVTT), Transparent ProRes 4444 MOV with Alpha,
    or PNG Sequence with alpha transparency (PRD Section 16 & Phase 4 Milestone 3).
    """
    output_dir = Path(request.output_directory) if request.output_directory else settings.RENDERS_DIR
    output_dir.mkdir(parents=True, exist_ok=True)
    
    results = {}
    
    # 1. Native Subtitles (SRT)
    if request.output_type in ["srt", "both", "all"]:
        srt_path = output_dir / f"{request.filename_prefix}.srt"
        ExportService.generate_srt(request.captions, srt_path)
        results["srt_path"] = str(srt_path.resolve())
        
    # 2. Native Subtitles (WebVTT)
    if request.output_type in ["vtt", "both", "all"]:
        vtt_path = output_dir / f"{request.filename_prefix}.vtt"
        ExportService.generate_vtt(request.captions, vtt_path)
        results["vtt_path"] = str(vtt_path.resolve())
        
    # 3. Transparent Apple ProRes 4444 MOV
    if request.output_type in ["prores_4444", "both", "all"]:
        mov_path = output_dir / f"{request.filename_prefix}_transparent.mov"
        actual_mov_path = ExportService.render_transparent_prores_mov(request, mov_path)
        results["mov_path"] = str(actual_mov_path.resolve())

    # 4. PNG Sequence (Milestone 3 C)
    if request.output_type in ["png_sequence", "all"]:
        png_dir = output_dir / f"{request.filename_prefix}_png_seq"
        png_meta = ExportService.render_png_sequence(request, png_dir)
        results["png_sequence"] = png_meta

    # 5. Burned-in H.264 MP4 (Milestone 5)
    if request.output_type in ["mp4", "all"]:
        mp4_path = output_dir / f"{request.filename_prefix}_burned.mp4"
        actual_mp4_path = ExportService.render_burned_mp4(request, mp4_path)
        results["mp4_path"] = str(actual_mp4_path.resolve())
        
    return {
        "status": "success",
        "output_type": request.output_type,
        "files": results
    }

@router.post("/layout/auto-group", response_model=List[CaptionModel])
def auto_group_captions(request: AutoGroupRequest):
    """
    Groups words into captions using reading rate, pauses, and visual balance.
    """
    return layout_engine.group_words_into_captions(
        words=request.words,
        layout_family=request.layout_family,
        fps=request.fps
    )
