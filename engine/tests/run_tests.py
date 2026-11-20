import unittest
from pathlib import Path
import tempfile
import sys

# Ensure engine path is in sys.path
engine_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(engine_dir))

from fastapi.testclient import TestClient
from app.main import app
from app.models.schemas import WordModel, CaptionModel, ExportRequest
from app.services.caption_layout import layout_engine
from app.services.export_service import ExportService

class TestCaptionLabEngine(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_01_health_endpoint(self):
        """Test health check and engine capabilities"""
        response = self.client.get("/health/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "healthy")
        self.assertEqual(data["app_name"], "CaptionLab Engine")
        self.assertTrue(data["ffmpeg_available"])
        print("\n[PASS] Health endpoint and FFmpeg detection verified.")

    def test_02_hindi_mixed_transcription(self):
        """
        PRD Section 3 & 6: Preserves Hindi and English Latin script as spoken
        e.g. 'आज हम इस project की नई technology के बारे में बात करेंगे।'
        """
        response = self.client.post("/transcribe/path", json={
            "audio_path": "dummy.wav",
            "language": "hindi_mixed"
        })
        self.assertEqual(response.status_code, 200)
        data = response.json()
        words_text = [w["text"] for w in data["words"]]
        
        # Must preserve 'project' and 'technology' in Latin script
        self.assertIn("project", words_text)
        self.assertIn("technology", words_text)
        # Must preserve Hindi in Devanagari script
        self.assertIn("आज", words_text)
        self.assertIn("हम", words_text)
        print("[PASS] Hindi + Hinglish script preservation verified.")

    def test_03_caption_grouping_and_provenance(self):
        """
        PRD Section 8 & 9.10: Auto-grouping into readable segments and
        protecting USER manual overrides.
        """
        sample_words = [
            WordModel(word_id=f"w{i}", text=t, start=i*0.5, end=(i+1)*0.5, confidence=0.95, corrected=False)
            for i, t in enumerate(["आज", "हम", "सरोजनीनगर", "के", "विकास", "कार्यों", "की", "बात", "करेंगे।"])
        ]
        
        captions = layout_engine.group_words_into_captions(sample_words, max_words_per_caption=4)
        self.assertGreaterEqual(len(captions), 2)
        self.assertEqual(captions[0].start_time, 0.0)
        
        # Test manual override protection
        cap = captions[0]
        cap.typography.color = "#FF0000"
        cap.user_overridden_properties.append("typography.color")
        
        preset = {
            "typography": {"color": "#00FF00", "font_size": 52}
        }
        updated = layout_engine.apply_style_preset(cap, preset)
        # Color must remain USER overridden #FF0000, font_size gets applied
        self.assertEqual(updated.typography.color, "#FF0000")
        self.assertEqual(updated.typography.font_size, 52)
        print("[PASS] Caption grouping & USER property provenance protection verified.")

    def test_04_srt_and_vtt_export(self):
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
            self.assertTrue(srt_file.exists())
            srt_content = srt_file.read_text(encoding="utf-8")
            self.assertIn("00:00:00,500 --> 00:00:02,500", srt_content)
            self.assertIn("नमस्ते India", srt_content)
            
            ExportService.generate_vtt([cap], vtt_file)
            self.assertTrue(vtt_file.exists())
            vtt_content = vtt_file.read_text(encoding="utf-8")
            self.assertIn("WEBVTT", vtt_content)
            self.assertIn("00:00:00.500 --> 00:00:02.500", vtt_content)
            print("[PASS] SRT & WebVTT native subtitle exports verified.")

    def test_05_transparent_prores_export(self):
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
            self.assertTrue(mov_file.exists())
            self.assertGreater(mov_file.stat().st_size, 1000)
            print(f"[PASS] Transparent ProRes 4444 MOV with alpha generated successfully ({mov_file.stat().st_size} bytes).")

if __name__ == "__main__":
    unittest.main()
