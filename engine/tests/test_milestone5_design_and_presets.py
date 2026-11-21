import unittest
import tempfile
from pathlib import Path
from app.services.preset_service import preset_service, BUILTIN_STYLE_PRESETS, BUILTIN_MOTION_PRESETS
from app.services.font_service import font_service
from app.services.caption_layout import CaptionLayoutEngine
from app.services.export_service import ExportService
from app.models.schemas import WordModel, CaptionModel, ExportRequest, PresetModel

class TestMilestone5DesignAndPresets(unittest.TestCase):
    """
    Automated test suite for Milestone 5 Advanced Design Studio,
    Preset Management, Font Discovery, and H.264 MP4 export.
    """

    def test_01_builtin_presets_seeded(self):
        """Validates that 10 style presets and 10 motion presets are preloaded."""
        self.assertEqual(len(BUILTIN_STYLE_PRESETS), 10)
        self.assertEqual(len(BUILTIN_MOTION_PRESETS), 10)
        import asyncio
        presets = asyncio.run(preset_service.list_presets())
        self.assertGreaterEqual(len(presets), 20)

    def test_02_custom_preset_crud_operations(self):
        """Validates creating, retrieving, and deleting a custom preset."""
        import asyncio
        custom_p = PresetModel(
            id="test_custom_001",
            name="My Test Preset",
            category="style",
            version="1.3.0",
            preset_data={"layout_family": "cinematic", "typography": {"font_size": 50}}
        )
        # Save
        res = asyncio.run(preset_service.save_preset(custom_p))
        self.assertEqual(res["status"], "saved")

        # Get
        fetched = asyncio.run(preset_service.get_preset("test_custom_001"))
        self.assertIsNotNone(fetched)
        self.assertEqual(fetched["name"], "My Test Preset")

        # Delete
        deleted = asyncio.run(preset_service.delete_preset("test_custom_001"))
        self.assertTrue(deleted)

    def test_03_local_font_catalog_discovery(self):
        """Validates local font discovery finds system Devanagari fonts."""
        fonts = font_service.get_available_fonts()
        self.assertGreater(len(fonts), 0)
        families = [f["family"] for f in fonts]
        # At least one Devanagari font must be present on Windows (Mangal, Nirmala UI, or Arial)
        has_devanagari = any(f["supports_devanagari"] for f in fonts)
        self.assertTrue(has_devanagari, f"Found fonts: {families}")

    def test_04_dynamic_multi_line_wrapping(self):
        """Validates line wrapping without splitting atomic Hindi words."""
        words = [
            WordModel(word_id="w1", text="यह", start=0.0, end=0.3),
            WordModel(word_id="w2", text="एक", start=0.35, end=0.6),
            WordModel(word_id="w3", text="बहुत", start=0.65, end=1.0),
            WordModel(word_id="w4", text="महत्वपूर्ण", start=1.05, end=1.6),
            WordModel(word_id="w5", text="प्रोजेक्ट", start=1.65, end=2.2),
            WordModel(word_id="w6", text="है", start=2.25, end=2.5)
        ]
        # Wrap with small max length of 15 characters
        lines = CaptionLayoutEngine.wrap_words_into_lines(words, max_chars_per_line=15)
        self.assertGreaterEqual(len(lines), 2)
        # Verify no words were lost or split
        total_wrapped_words = sum(len(l) for l in lines)
        self.assertEqual(total_wrapped_words, len(words))

    def test_05_burned_in_mp4_export(self):
        """Validates rendering H.264 MP4 with burned-in captions."""
        cap = CaptionModel(
            caption_id="cap_mp4",
            start_time=0.0,
            end_time=0.4,
            duration=0.4,
            words=[WordModel(word_id="w1", text="एमपी4", start=0.0, end=0.4)]
        )
        req = ExportRequest(
            output_type="mp4",
            captions=[cap],
            resolution={"width": 640, "height": 360},
            fps=25.0,
            filename_prefix="test_mp4"
        )
        with tempfile.TemporaryDirectory() as tmpdir:
            out_file = Path(tmpdir) / "output_test.mp4"
            actual_path = ExportService.render_burned_mp4(req, out_file)
            self.assertTrue(actual_path.exists())
            self.assertGreater(actual_path.stat().st_size, 1000)

if __name__ == "__main__":
    unittest.main()
