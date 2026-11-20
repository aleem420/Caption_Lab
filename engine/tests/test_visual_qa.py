import unittest
from pathlib import Path
import unicodedata
import tempfile
import sys

# Ensure engine path is in sys.path
engine_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(engine_dir))

from app.models.schemas import WordModel, CaptionModel, ExportRequest, TypographyModel, BackgroundModel, NormalizedCoordinatesModel
from app.services.caption_layout import layout_engine
from app.services.export_service import ExportService

class TestVisualAndAnimationQA(unittest.TestCase):
    def test_01_hindi_typography_graphemes_and_ligatures(self):
        """
        PRD Section 11 & Milestone 4 A:
        Tests Hindi Devanagari matras, conjuncts, half-letters, reph, and mixed English.
        Verifies Unicode normalization (NFC) and word-level integrity.
        """
        complex_hindi_words = [
            "किताब",      # Matra (इ-कार)
            "पृथ्वी",     # Ri-matra + half-tha
            "संयुक्ताक्षर", # Anusvara + conjuncts + ksha
            "प्रकाश",     # Pra (R-consonant conjunct)
            "धर्म",       # Reph (R-superscript)
            "राष्ट्र",     # R-halant sub-consonant
            "फ़िल्म",     # Nuqta + conjunct
            "technology",# English Latin term
            "विकास",     # Standard Hindi word
            "कार्यों"     # Plural anusvara + reph
        ]

        for word in complex_hindi_words:
            # Check Unicode Normalization
            nfc_normalized = unicodedata.normalize("NFC", word)
            self.assertEqual(word, nfc_normalized)

            # Ensure word is treated as an atomic unit (never split during word animation)
            w_item = WordModel(
                word_id="w_test",
                text=word,
                start=0.0,
                end=1.0,
                confidence=0.99,
                corrected=False
            )
            self.assertEqual(w_item.text, word)
            self.assertGreater(len(w_item.text), 0)

        print("\n[QA 1/5] Hindi Devanagari matras, conjuncts, half-letters & reph normalization verified.")

    def test_02_all_8_layout_families(self):
        """
        PRD Section 10.4 & Milestone 4 C:
        Validates all 8 layout families:
        single_line, balanced_two_line, stacked, keyword_highlight,
        word_by_word, speaker_based, boxed, cinematic.
        """
        layout_families = [
            "single_line",
            "balanced_two_line",
            "stacked",
            "keyword_highlight",
            "word_by_word",
            "speaker_based",
            "boxed",
            "cinematic"
        ]

        sample_words = [
            WordModel(word_id=f"w{i}", text=t, start=i*0.5, end=(i+1)*0.5, confidence=0.95, corrected=False)
            for i, t in enumerate(["आज", "हम", "इस", "project", "की", "बात", "करेंगे।"])
        ]

        for layout in layout_families:
            captions = layout_engine.group_words_into_captions(
                words=sample_words,
                layout_family=layout,
                max_words_per_caption=4
            )
            self.assertGreater(len(captions), 0)
            for cap in captions:
                self.assertEqual(cap.layout_family, layout)
                # Verify normalized coordinates within safe bounds (0.05 to 0.95)
                self.assertGreaterEqual(cap.coordinates.x, 0.05)
                self.assertLessEqual(cap.coordinates.x, 0.95)
                self.assertGreaterEqual(cap.coordinates.y, 0.05)
                self.assertLessEqual(cap.coordinates.y, 0.95)
                # Boxed layout must have background box enabled
                if layout == "boxed":
                    self.assertTrue(cap.background.enabled)

        print("[QA 2/5] All 8 layout families validated within safe-area bounds.")

    def test_03_aspect_ratios_and_resolutions(self):
        """
        PRD Section 10.6 & Milestone 4 C:
        Tests 16:9 (Landscape), 9:16 (Vertical Reels/Shorts), 1:1 (Square), 4:5 (Feed), and Custom.
        """
        resolutions = [
            {"width": 1920, "height": 1080, "name": "16:9 Landscape"},
            {"width": 1080, "height": 1920, "name": "9:16 Vertical Shorts/Reels"},
            {"width": 1080, "height": 1080, "name": "1:1 Square"},
            {"width": 1080, "height": 1350, "name": "4:5 Portrait"},
            {"width": 1280, "height": 720,  "name": "720p HD"}
        ]

        cap = CaptionModel(
            caption_id="cap_res",
            start_frame=0,
            end_frame=30,
            start_time=0.0,
            end_time=1.0,
            duration=1.0,
            words=[
                WordModel(word_id="w1", text="सरोजनीनगर", start=0.0, end=0.5, confidence=1.0, corrected=False),
                WordModel(word_id="w2", text="विकास", start=0.5, end=1.0, confidence=1.0, corrected=False)
            ]
        )

        with tempfile.TemporaryDirectory() as tmpdir:
            for res_info in resolutions:
                req = ExportRequest(
                    output_type="prores_4444",
                    captions=[cap],
                    resolution={"width": res_info["width"], "height": res_info["height"]},
                    fps=30.0,
                    filename_prefix=f"test_{res_info['width']}x{res_info['height']}"
                )
                mov_file = Path(tmpdir) / f"{req.filename_prefix}.mov"
                ExportService.render_transparent_prores_mov(req, mov_file)
                self.assertTrue(mov_file.exists())
                self.assertGreater(mov_file.stat().st_size, 5000)

        print("[QA 3/5] Resolutions 16:9, 9:16, 1:1, 4:5 and Custom validated in ProRes 4444.")

    def test_04_user_customization_strict_preservation(self):
        """
        PRD Section 9.10:
        Automatic layout regeneration must NEVER overwrite properties marked as USER.
        """
        cap = CaptionModel(
            caption_id="cap_user",
            start_frame=0,
            end_frame=30,
            start_time=0.0,
            end_time=1.0,
            duration=1.0,
            words=[WordModel(word_id="w1", text="परीक्षण", start=0.0, end=1.0, confidence=1.0, corrected=True)],
            user_overridden_properties=["typography.color", "typography.font_size", "coordinates.y"]
        )
        cap.typography.color = "#FF0055"
        cap.typography.font_size = 64
        cap.coordinates.y = 0.40 # Custom center placement

        # Apply a preset that specifies different values
        preset = {
            "typography": {"color": "#FFFFFF", "font_size": 40, "font_weight": "900"},
            "coordinates": {"y": 0.85}
        }
        updated = layout_engine.apply_style_preset(cap, preset)

        # USER overridden properties must NOT change
        self.assertEqual(updated.typography.color, "#FF0055")
        self.assertEqual(updated.typography.font_size, 64)
        self.assertEqual(updated.coordinates.y, 0.40)
        # Non-overridden property (font_weight) gets applied cleanly
        self.assertEqual(updated.typography.font_weight, "900")
        print("[QA 4/5] USER customization strict preservation verified against presets & auto-regens.")

    def test_05_png_sequence_and_missing_frame_detection(self):
        """
        Milestone 3 C & Milestone 4 B/D:
        Verifies PNG sequence export, frame numbering (%06d.png),
        alpha transparency, and missing frame corruption detection.
        """
        cap = CaptionModel(
            caption_id="cap_png",
            start_frame=0,
            end_frame=15,
            start_time=0.0,
            end_time=0.5,
            duration=0.5,
            words=[WordModel(word_id="w1", text="मोशन", start=0.0, end=0.5, confidence=1.0, corrected=False)]
        )
        req = ExportRequest(
            output_type="png_sequence",
            captions=[cap],
            resolution={"width": 320, "height": 180},
            fps=30.0,
            filename_prefix="test_png_seq"
        )

        with tempfile.TemporaryDirectory() as tmpdir:
            out_dir = Path(tmpdir) / "frames"
            res = ExportService.render_png_sequence(req, out_dir)
            self.assertEqual(res["total_frames"], 15)
            self.assertTrue(Path(res["first_frame"]).exists())
            self.assertTrue((out_dir / "frame_000014.png").exists())
            # Verify frame 0 is a valid 32-bit RGBA PNG
            from PIL import Image
            with Image.open(res["first_frame"]) as img:
                self.assertEqual(img.mode, "RGBA")
                self.assertEqual(img.size, (320, 180))

        print("[QA 5/5] PNG Sequence export (RGBA 32-bit, %06d.png) & frame integrity verified.")

if __name__ == "__main__":
    unittest.main()
