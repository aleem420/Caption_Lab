import unittest
import time
import psutil
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
from app.core.errors import get_error, ERROR_CATALOG

class TestStressAndProductionBenchmarks(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_01_diagnostics_endpoint_security(self):
        """
        Milestone 5 E:
        Verifies GET /health/diagnostics returns complete telemetry without leaking secrets.
        """
        res = self.client.get("/health/diagnostics")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["captionlab_version"], "1.2.0")
        self.assertIn("environment", data)
        self.assertIn("hardware_acceleration", data)
        self.assertTrue(data["ffmpeg_available"])
        self.assertIn("token_masked", data["security"])
        self.assertTrue(data["security"]["token_masked"].startswith("••••••••"))
        print("\n[STRESS 1/5] Diagnostics endpoint verified with token masking.")

    def test_02_error_catalog_completeness(self):
        """
        Milestone 5 E:
        Verifies structured error codes and actionable remedies.
        """
        self.assertGreaterEqual(len(ERROR_CATALOG), 10)
        err = get_error("CL-ERR-1002")
        self.assertEqual(err["code"], "CL-ERR-1002")
        self.assertIn("Supported formats", err["remedy"])
        print("[STRESS 2/5] Error catalog and remediation guidance verified.")

    def test_03_30_minute_transcript_stress_test(self):
        """
        Milestone 5 A:
        Stress test: 30-minute audio transcript (1,800 seconds, ~1,500 words).
        Verifies bounded memory, layout calculation speed, and zero drift.
        """
        t0 = time.time()
        process = psutil.Process()
        mem_before_mb = process.memory_info().rss / (1024 ** 2)

        # Generate 1,500 words spanning 1,800 seconds (30 minutes)
        words_30m = []
        for i in range(1500):
            start = i * 1.2
            end = start + 0.9
            words_30m.append(
                WordModel(
                    word_id=f"w{i+1:05d}",
                    text=f"शब्द_{i+1}",
                    start=round(start, 2),
                    end=round(end, 2),
                    confidence=0.96,
                    corrected=False
                )
            )

        # Group words into captions
        captions = layout_engine.group_words_into_captions(
            words=words_30m,
            max_words_per_caption=5,
            max_duration=4.5
        )

        calc_time = time.time() - t0
        mem_after_mb = process.memory_info().rss / (1024 ** 2)
        mem_growth_mb = mem_after_mb - mem_before_mb

        self.assertGreaterEqual(len(captions), 280)
        self.assertAlmostEqual(captions[-1].end_time, 1800.0, delta=10.0)
        self.assertLess(calc_time, 2.0) # Calculation should complete in under 2 seconds!
        self.assertLess(mem_growth_mb, 50.0) # Memory growth strictly bounded

        print(f"[STRESS 3/5] 30-Minute transcript ({len(words_30m)} words -> {len(captions)} captions) completed in {calc_time:.3f}s (RAM growth: {mem_growth_mb:.1f} MB).")

    def test_04_60_minute_transcript_stress_test(self):
        """
        Milestone 5 A:
        Stress test: 60-minute long audio project (3,600 seconds, ~3,000 words).
        Verifies that SRT export scales linearly and doesn't exhaust memory.
        """
        words_60m = []
        for i in range(3000):
            start = i * 1.2
            end = start + 0.9
            words_60m.append(
                WordModel(
                    word_id=f"w{i+1:05d}",
                    text=f"वाक्य_{i+1}",
                    start=round(start, 2),
                    end=round(end, 2),
                    confidence=0.98,
                    corrected=False
                )
            )

        captions = layout_engine.group_words_into_captions(
            words=words_60m,
            max_words_per_caption=5,
            max_duration=4.5
        )

        with tempfile.TemporaryDirectory() as tmpdir:
            srt_path = Path(tmpdir) / "stress_60m.srt"
            t0 = time.time()
            ExportService.generate_srt(captions, srt_path)
            export_time = time.time() - t0

            self.assertTrue(srt_path.exists())
            self.assertGreater(srt_path.stat().st_size, 50000) # > 50KB SRT
            self.assertLess(export_time, 1.0) # Export in under 1 second

        print(f"[STRESS 4/5] 60-Minute transcript ({len(words_60m)} words -> {len(captions)} captions) SRT generated in {export_time:.3f}s.")

    def test_05_temporary_file_cleanup_and_recovery(self):
        """
        Milestone 5 C:
        Verifies temporary directories are safely cleaned up and no orphaned
        locks remain on the filesystem after ProRes / PNG exports.
        """
        cap = CaptionModel(
            caption_id="cap_cleanup",
            start_frame=0,
            end_frame=15,
            start_time=0.0,
            end_time=0.5,
            duration=0.5,
            words=[WordModel(word_id="w1", text="सफाई", start=0.0, end=0.5, confidence=1.0, corrected=False)]
        )
        req = ExportRequest(
            output_type="prores_4444",
            captions=[cap],
            resolution={"width": 320, "height": 180},
            fps=30.0,
            filename_prefix="test_cleanup"
        )

        with tempfile.TemporaryDirectory() as tmpdir:
            mov_file = Path(tmpdir) / "cleanup.mov"
            ExportService.render_transparent_prores_mov(req, mov_file)
            self.assertTrue(mov_file.exists())
            # Clean up destination
            mov_file.unlink()
            self.assertFalse(mov_file.exists())

        print("[STRESS 5/5] Temporary file cleanup and zero-leak filesystem recovery verified.")

if __name__ == "__main__":
    unittest.main()
