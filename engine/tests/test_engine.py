import pytest
from fastapi.testclient import TestClient
from pathlib import Path
import tempfile
import json
from app.main import app
from app.models.schemas import WordModel, CaptionModel, ExportRequest
from app.services.caption_layout import layout_engine
from app.services.export_service import ExportService

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/health/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["app_name"] == "CaptionLab Engine"
    assert "ffmpeg_available" in data
    assert data["ffmpeg_available"] is True

def test_transcription_hindi_mixed_preservation():
    """
    PRD Section 3 & 6: Preserves Hindi and English Latin script as spoken
    e.g. 'आज हम इस project की नई technology के बारे में बात करेंगे।'
    """
    response = client.post("/transcribe/path", json={
        "audio_path": "dummy.wav",
        "language": "hindi_mixed"
    })
    assert response.status_code == 200
    data = response.json()
    assert len(data["words"]) > 0
    words_text = [w["text"] for w in data["words"]]
    
    # Must preserve 'project' and 'technology' in Latin script
    assert "project" in words_text
    assert "technology" in words_text
    # Must preserve Hindi in Devanagari script
    assert "आज" in words_text
    assert "हम" in words_text

def test_caption_grouping_and_provenance():
    """
    PRD Section 8 & 9.10: Auto-grouping into readable segments and
    protecting USER manual overrides.
    """
    sample_words = [
        WordModel(word_id=f"w{i}", text=t, start=i*0.5, end=(i+1)*0.5, confidence=0.95, corrected=False)
        for i, t in enumerate(["आज", "हम", "सरोजनीनगर", "के", "विकास", "कार्यों", "की", "बात", "करेंगे।"])
    ]
    
    captions = layout_engine.group_words_into_captions(sample_words, max_words_per_caption=4)
    assert len(captions) >= 2
    assert captions[0].start_time == 0.0
    assert captions[0].end_time > 1.0
    
    # Test manual override protection
    cap = captions[0]
    cap.typography.color = "#FF0000"
    cap.user_overridden_properties.append("typography.color")
    
    preset = {
        "typography": {"color": "#00FF00", "font_size": 52}
    }
    updated = layout_engine.apply_style_preset(cap, preset)
    # Color must remain USER overridden #FF0000, font_size gets applied
    assert updated.typography.color == "#FF0000"
    assert updated.typography.font_size == 52

def test_srt_and_vtt_export():
    """PRD Section 16: Editable native subtitle export with Devanagari support"""
    words = [
        WordModel(word_id="w1", text="नमस्ते", start=0.5, end=1.5, confidence=0.99, corrected=False),
        WordModel(word_id="w2", text="India", start=1.5, end=2.5, confidence=0.99, corrected=False)
    ]
    cap = CaptionModel(
        caption_id="cap_001",
        start_frame=15,
        end_frame=75,
        start_time=0.5,
        end_time=2.5,
        duration=2.0,
        words=words
    )
    
    with tempfile.TemporaryDirectory() as tmpdir:
        srt_file = Path(tmpdir) / "test.srt"
        vtt_file = Path(tmpdir) / "test.vtt"
        
        ExportService.generate_srt([cap], srt_file)
        assert srt_file.exists()
        srt_content = srt_file.read_text(encoding="utf-8")
        assert "00:00:00,500 --> 00:00:02,500" in srt_content
        assert "नमस्ते India" in srt_content
        
        ExportService.generate_vtt([cap], vtt_file)
        assert vtt_file.exists()
        vtt_content = vtt_file.read_text(encoding="utf-8")
        assert "WEBVTT" in vtt_content
        assert "00:00:00.500 --> 00:00:02.500" in vtt_content

def test_transparent_prores_export():
    """
    PRD Section 16 & Acceptance Criteria #14:
    Transparent ProRes 4444 MOV export with alpha channel.
    """
    words = [
        WordModel(word_id="w1", text="CaptionLab", start=0.0, end=0.5, confidence=1.0, corrected=False),
        WordModel(word_id="w2", text="Motion", start=0.5, end=1.0, confidence=1.0, corrected=False)
    ]
    cap = CaptionModel(
        caption_id="cap_001",
        start_frame=0,
        end_frame=30,
        start_time=0.0,
        end_time=1.0,
        duration=1.0,
        words=words
    )
    req = ExportRequest(
        output_type="prores_4444",
        captions=[cap],
        resolution={"width": 320, "height": 180},
        fps=30.0,
        filename_prefix="test_mov"
    )
    
    with tempfile.TemporaryDirectory() as tmpdir:
        mov_file = Path(tmpdir) / "test_mov.mov"
        ExportService.render_transparent_prores_mov(req, mov_file)
        assert mov_file.exists()
        assert mov_file.stat().st_size > 1000
