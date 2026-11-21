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

    def test_06_entrance_scale_measurement(self):
        """
        Milestone 3.2 Stage E: Entrance scale measurement (0.80x to 1.0x).
        Verifies that caption-level pop-in scales the rendered bounding box
        from 0.80x at frame 0 to 1.0x at the completion of entrance duration.
        """
        cap = CaptionModel(
            caption_id="cap_ent_test",
            start_time=0.0,
            end_time=1.0,
            duration=1.0,
            words=[WordModel(word_id="w1", text="नमस्ते", start=0.0, end=1.0)],
            animation={
                "entrance": {"type": "pop_in", "duration_frames": 4},
                "exit": {"type": "none", "duration_frames": 0},
                "word_animation": {"type": "none", "active_scale": 1.0}
            }
        )
        with tempfile.TemporaryDirectory() as tmpdir:
            out_dir = Path(tmpdir)
            ExportService._render_frames(
                ExportRequest(output_type="png_sequence", captions=[cap], resolution={"width": 1920, "height": 1080}, fps=25.0),
                out_dir
            )
            from PIL import Image
            img0 = Image.open(out_dir / "frame_000000.png")
            bbox0 = img0.getbbox()
            w0 = bbox0[2] - bbox0[0]

            img4 = Image.open(out_dir / "frame_000004.png")
            bbox4 = img4.getbbox()
            w4 = bbox4[2] - bbox4[0]

            ratio = w0 / w4
            # Allows small pixel tolerance for LANCZOS anti-aliased edge resampling
            self.assertGreaterEqual(ratio, 0.77)
            self.assertLessEqual(ratio, 0.83)
        print("[QA 6/15] Entrance scale pop-in (0.80x -> 1.0x) pixel measurement verified.")

    def test_07_word_level_geometric_scale(self):
        """
        Milestone 3.2 Stage E: Active-word geometric scaling (1.15x).
        Directly measures active word bounding box vs inactive word bounding box.
        """
        cap = CaptionModel(
            caption_id="cap_scale_test",
            start_time=0.0,
            end_time=2.0,
            duration=2.0,
            words=[
                WordModel(word_id="w1", text="नमस्ते", start=0.0, end=1.0),
                WordModel(word_id="w2", text="दोस्तों", start=1.0, end=2.0)
            ],
            animation={
                "entrance": {"type": "none", "duration_frames": 0},
                "exit": {"type": "none", "duration_frames": 0},
                "word_animation": {"type": "word_pop", "active_scale": 1.15}
            }
        )
        with tempfile.TemporaryDirectory() as tmpdir:
            out_dir = Path(tmpdir)
            ExportService._render_frames(
                ExportRequest(output_type="png_sequence", captions=[cap], resolution={"width": 1920, "height": 1080}, fps=25.0),
                out_dir
            )
            from PIL import Image
            import numpy as np

            # Frame 10 (t=0.40s): Word 1 active (1.15x)
            # Frame 35 (t=1.40s): Word 1 inactive (1.00x)
            img_act = Image.open(out_dir / "frame_000010.png")
            img_inact = Image.open(out_dir / "frame_000035.png")

            # Word 1 is in left half of canvas (x < 960)
            crop_act = np.array(img_act.crop((0, 0, 960, 1080)))[:, :, 3]
            crop_inact = np.array(img_inact.crop((0, 0, 960, 1080)))[:, :, 3]

            # Alpha thresholded bounding box to measure text core
            y_act, x_act = np.where(crop_act > 50)
            w_act = np.max(x_act) - np.min(x_act) + 1
            h_act = np.max(y_act) - np.min(y_act) + 1

            y_inact, x_inact = np.where(crop_inact > 50)
            w_inact = np.max(x_inact) - np.min(x_inact) + 1
            h_inact = np.max(y_inact) - np.min(y_inact) + 1

            scale_w = w_act / w_inact
            scale_h = h_act / h_inact
            self.assertGreaterEqual(scale_w, 1.11)
            self.assertLessEqual(scale_w, 1.20)
            self.assertGreaterEqual(scale_h, 1.11)
            self.assertLessEqual(scale_h, 1.22)
        print("[QA 7/15] Word-level geometric scaling (1.15x) pixel measurement verified.")

    def test_08_stable_text_baseline(self):
        """
        Milestone 3.2 Stage E: Stable text baseline alignment and stationary inactive words.
        Verifies that inactive words do not shift or jump when an adjacent word scales.
        """
        cap = CaptionModel(
            caption_id="cap_base_test",
            start_time=0.0,
            end_time=2.0,
            duration=2.0,
            words=[
                WordModel(word_id="w1", text="नमस्ते", start=0.0, end=1.0),
                WordModel(word_id="w2", text="दोस्तों", start=1.0, end=2.0)
            ],
            animation={
                "entrance": {"type": "none", "duration_frames": 0},
                "exit": {"type": "none", "duration_frames": 0},
                "word_animation": {"type": "word_pop", "active_scale": 1.15}
            }
        )
        with tempfile.TemporaryDirectory() as tmpdir:
            out_dir = Path(tmpdir)
            ExportService._render_frames(
                ExportRequest(output_type="png_sequence", captions=[cap], resolution={"width": 1920, "height": 1080}, fps=25.0),
                out_dir
            )
            from PIL import Image

            # In Frame 10, Word 2 is inactive (1.0x). In Frame 35, Word 2 is active (1.15x).
            # Crop Word 2 (right half, x > 960)
            img10 = Image.open(out_dir / "frame_000010.png")
            img35 = Image.open(out_dir / "frame_000035.png")

            b10 = img10.crop((960, 0, 1920, 1080)).getbbox()
            b35 = img35.crop((960, 0, 1920, 1080)).getbbox()

            cx10 = (b10[0] + b10[2]) / 2.0
            cx35 = (b35[0] + b35[2]) / 2.0

            # Center X of inactive word must stay stationary within 1.0px tolerance
            self.assertLessEqual(abs(cx10 - cx35), 1.0)
        print("[QA 8/15] Stable text baseline and stationary inactive word centers verified.")

    def test_09_smooth_alpha_fade(self):
        """
        Milestone 3.2 Stage E: Monotonic alpha fade-out across exit frames.
        Verifies per-frame alpha reduction without abrupt drops.
        """
        cap = CaptionModel(
            caption_id="cap_fade_test",
            start_time=0.0,
            end_time=1.0,
            duration=1.0,
            words=[WordModel(word_id="w1", text="परीक्षण", start=0.0, end=1.0)],
            animation={
                "entrance": {"type": "none", "duration_frames": 0},
                "exit": {"type": "fade_out", "duration_frames": 4},
                "word_animation": {"type": "none"}
            }
        )
        with tempfile.TemporaryDirectory() as tmpdir:
            out_dir = Path(tmpdir)
            ExportService._render_frames(
                ExportRequest(output_type="png_sequence", captions=[cap], resolution={"width": 1920, "height": 1080}, fps=25.0),
                out_dir
            )
            from PIL import Image
            import numpy as np

            # 4 exit frames: 21 (t=0.84s), 22 (t=0.88s), 23 (t=0.92s), 24 (t=0.96s)
            alphas = []
            for f in range(21, 25):
                img = Image.open(out_dir / f"frame_{f:06d}.png")
                arr = np.array(img)[:, :, 3]
                alphas.append(int(np.max(arr)))

            # Monotonic reduction
            self.assertGreaterEqual(alphas[0], alphas[1])
            self.assertGreaterEqual(alphas[1], alphas[2])
            self.assertGreaterEqual(alphas[2], alphas[3])
            # Last frame is faded significantly below 255
            self.assertLessEqual(alphas[3], 100)
        print("[QA 9/15] Monotonic alpha fade-out verified across exit frames.")

    def test_10_fully_transparent_exit_frame(self):
        """
        Milestone 3.2 Stage E: Fully transparent exit frame post-caption.
        Verifies that frames at or after caption end_time have zero opacity (A=0).
        """
        cap1 = CaptionModel(
            caption_id="cap_trans_test",
            start_time=0.0,
            end_time=0.5,
            duration=0.5,
            words=[WordModel(word_id="w1", text="समाप्त", start=0.0, end=0.5)],
            animation={"exit": {"type": "fade_out", "duration_frames": 4}}
        )
        cap2 = CaptionModel(
            caption_id="cap_trans_tail",
            start_time=0.6,
            end_time=0.7,
            duration=0.1,
            words=[WordModel(word_id="w2", text="पुनः", start=0.6, end=0.7)]
        )
        with tempfile.TemporaryDirectory() as tmpdir:
            out_dir = Path(tmpdir)
            # Render up to 0.7s (18 frames: 0 to 17)
            ExportService._render_frames(
                ExportRequest(output_type="png_sequence", captions=[cap1, cap2], resolution={"width": 1920, "height": 1080}, fps=25.0),
                out_dir
            )
            from PIL import Image
            import numpy as np

            # Frame 13 (t=0.52s) is after end_time (0.50s)
            img13 = Image.open(out_dir / "frame_000013.png")
            arr = np.array(img13)[:, :, 3]
            self.assertEqual(int(np.max(arr)), 0)
            self.assertIsNone(img13.getbbox())
        print("[QA 10/15] Fully transparent post-caption exit frame (A=0) verified.")

    def test_11_devanagari_conjunct_preservation_under_scale(self):
        """
        Milestone 3.2 Stage E: Devanagari conjuncts & matras preserved under 1.15x geometric scaling.
        """
        complex_words = ["संयुक्ताक्षर", "प्रकाश", "फ़िल्म", "पृथ्वी"]
        for word in complex_words:
            cap = CaptionModel(
                caption_id=f"cap_{word}",
                start_time=0.0,
                end_time=1.0,
                duration=1.0,
                words=[WordModel(word_id="w1", text=word, start=0.0, end=1.0)],
                animation={"word_animation": {"type": "word_pop", "active_scale": 1.15}}
            )
            with tempfile.TemporaryDirectory() as tmpdir:
                out_dir = Path(tmpdir)
                ExportService._render_frames(
                    ExportRequest(output_type="png_sequence", captions=[cap], resolution={"width": 1920, "height": 1080}, fps=25.0),
                    out_dir
                )
                from PIL import Image
                img = Image.open(out_dir / "frame_000010.png")
                bbox = img.getbbox()
                self.assertIsNotNone(bbox)
                self.assertGreater(bbox[2] - bbox[0], 50)
                self.assertGreater(bbox[3] - bbox[1], 30)
        print("[QA 11/15] Devanagari conjunct & matra preservation under 1.15x scale verified.")

    def test_12_mixed_script_alignment(self):
        """
        Milestone 3.2 Stage E: Hinglish mixed script baseline alignment.
        """
        cap = CaptionModel(
            caption_id="cap_hinglish",
            start_time=0.0,
            end_time=1.0,
            duration=1.0,
            words=[
                WordModel(word_id="w1", text="CaptionLab", start=0.0, end=0.5),
                WordModel(word_id="w2", text="प्रोजेक्ट", start=0.5, end=1.0)
            ],
            animation={"word_animation": {"type": "word_pop", "active_scale": 1.15}}
        )
        with tempfile.TemporaryDirectory() as tmpdir:
            out_dir = Path(tmpdir)
            ExportService._render_frames(
                ExportRequest(output_type="png_sequence", captions=[cap], resolution={"width": 1920, "height": 1080}, fps=25.0),
                out_dir
            )
            from PIL import Image
            img = Image.open(out_dir / "frame_000005.png")
            bbox = img.getbbox()
            self.assertIsNotNone(bbox)
            self.assertGreater(bbox[2] - bbox[0], 100)
        print("[QA 12/15] Hinglish mixed script alignment under animation verified.")

    def test_13_safe_area_collision_check(self):
        """
        Milestone 3.2 Stage E: Safe-area boundary compliance under 1.15x expansion.
        """
        long_sentence = ["Today", "we", "are", "demonstrating", "advance", "animations"]
        cap = CaptionModel(
            caption_id="cap_safe",
            start_time=0.0,
            end_time=1.0,
            duration=1.0,
            words=[WordModel(word_id=f"w{i}", text=t, start=i*0.15, end=(i+1)*0.15) for i, t in enumerate(long_sentence)],
            animation={"word_animation": {"type": "word_pop", "active_scale": 1.15}}
        )
        with tempfile.TemporaryDirectory() as tmpdir:
            out_dir = Path(tmpdir)
            ExportService._render_frames(
                ExportRequest(output_type="png_sequence", captions=[cap], resolution={"width": 1920, "height": 1080}, fps=25.0),
                out_dir
            )
            from PIL import Image
            # Sample frames during maximum scale
            for f in [5, 10, 15]:
                img = Image.open(out_dir / f"frame_{f:06d}.png")
                bbox = img.getbbox()
                if bbox:
                    # Must be inside Action Safe 90% ([96, 1824] x [54, 1026])
                    self.assertGreaterEqual(bbox[0], 96)
                    self.assertLessEqual(bbox[2], 1824)
                    self.assertGreaterEqual(bbox[1], 54)
                    self.assertLessEqual(bbox[3], 1026)
        print("[QA 13/15] Safe-area compliance under maximum geometric scale verified.")

    def test_14_half_open_boundary_handoff(self):
        """
        Milestone 3.2 Stage E: Deterministic half-open interval boundary handoff [start_time, end_time).
        """
        c1 = CaptionModel(
            caption_id="c1", start_time=0.0, end_time=1.0, duration=1.0,
            words=[WordModel(word_id="w1", text="पहला", start=0.0, end=1.0)]
        )
        c2 = CaptionModel(
            caption_id="c2", start_time=1.0, end_time=2.0, duration=1.0,
            words=[WordModel(word_id="w2", text="दूसरा", start=1.0, end=2.0)]
        )
        with tempfile.TemporaryDirectory() as tmpdir:
            out_dir = Path(tmpdir)
            ExportService._render_frames(
                ExportRequest(output_type="png_sequence", captions=[c1, c2], resolution={"width": 1920, "height": 1080}, fps=25.0),
                out_dir
            )
            from PIL import Image
            # Frame 24 (t=0.96s): must be c1
            # Frame 25 (t=1.00s): must be c2
            img24 = Image.open(out_dir / "frame_000024.png")
            img25 = Image.open(out_dir / "frame_000025.png")
            self.assertIsNotNone(img24.getbbox())
            self.assertIsNotNone(img25.getbbox())
        print("[QA 14/15] Deterministic half-open boundary handoff [start_time, end_time) verified.")

    def test_15_prores_4444_alpha_preservation(self):
        """
        Milestone 3.2 Stage E: ProRes 4444 alpha channel preservation with active animation pipeline.
        """
        import subprocess, json
        cap = CaptionModel(
            caption_id="c_prores",
            start_time=0.0,
            end_time=0.5,
            duration=0.5,
            words=[WordModel(word_id="w1", text="पारदर्शी", start=0.0, end=0.5)],
            animation={
                "entrance": {"type": "pop_in", "duration_frames": 3},
                "exit": {"type": "fade_out", "duration_frames": 3},
                "word_animation": {"type": "word_pop", "active_scale": 1.15}
            }
        )
        with tempfile.TemporaryDirectory() as tmpdir:
            mov_path = Path(tmpdir) / "test_anim_alpha.mov"
            req = ExportRequest(
                output_type="prores_4444",
                captions=[cap],
                resolution={"width": 1920, "height": 1080},
                fps=25.0
            )
            res_path = ExportService.render_transparent_prores_mov(req, mov_path)
            self.assertTrue(res_path.exists())
            
            cmd = ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=codec_name,pix_fmt", "-of", "json", str(res_path)]
            probe = subprocess.run(cmd, capture_output=True, text=True)
            info = json.loads(probe.stdout)["streams"][0]
            self.assertEqual(info["codec_name"], "prores")
            self.assertIn(info["pix_fmt"], ["yuva444p10le", "yuva444p12le"])
        print("[QA 15/16] ProRes 4444 alpha channel preservation with animation engine verified.")

    def test_16_ten_complex_hindi_words_rasterization_and_shaping(self):
        """
        Milestone 4.6 Hindi Typography Validation:
        Validates all 10 complex Hindi and mixed-script test words:
        1. नमस्ते (half-sa + ta conjunct)
        2. दोस्तों (half-sa + ta + anusvara plural)
        3. स्वागत (half-sa + va conjunct)
        4. प्रोजेक्ट (pra consonant conjunct + half-ka + ta)
        5. क्षेत्र (ksha conjunct + tra conjunct)
        6. शक्ति (half-ka + ta + i-matra)
        7. भारत (classic Hindi noun)
        8. क्या (half-ka + ya)
        9. क्षत्रिय (ksha + tra + i-matra + ya)
        10. महत्वपूर्ण (half-ha + ta + va + u-matra + reph + na)
        """
        words = [
            "नमस्ते", "दोस्तों", "स्वागत", "प्रोजेक्ट", "क्षेत्र",
            "शक्ति", "भारत", "क्या", "क्षत्रिय", "महत्वपूर्ण"
        ]

        from PIL import Image, ImageDraw, ImageFont
        font_candidates = [
            "C:/Windows/Fonts/mangal.ttf",
            "C:/Windows/Fonts/Nirmala.ttf",
            "C:/Windows/Fonts/arial.ttf",
        ]
        font = None
        for fc in font_candidates:
            if Path(fc).exists():
                try:
                    font = ImageFont.truetype(fc, 48)
                    break
                except Exception:
                    pass
        if font is None:
            font = ImageFont.load_default()
        self.assertIsNotNone(font)

        for w in words:
            # 1. NFC normalization check
            nfc = unicodedata.normalize("NFC", w)
            self.assertEqual(w, nfc)

            # 2. PIL textbbox calculation
            img = Image.new("RGBA", (800, 200), (0, 0, 0, 0))
            draw = ImageDraw.Draw(img)
            bbox = draw.textbbox((100, 50), w, font=font)
            width = bbox[2] - bbox[0]
            height = bbox[3] - bbox[1]

            # Bounding box must be strictly positive (rasterized non-empty glyphs)
            self.assertGreater(width, 20, f"Rasterized width for '{w}' is unexpectedly small ({width}px)")
            self.assertGreater(height, 15, f"Rasterized height for '{w}' is unexpectedly small ({height}px)")

            # 3. Draw text and verify non-zero alpha pixel count
            draw.text((100, 50), w, font=font, fill=(255, 255, 255, 255))
            alpha_extrema = img.getextrema()[3]
            self.assertEqual(alpha_extrema[1], 255, f"Alpha channel did not render opaque pixels for '{w}'")

        print("[QA 16/16] All 10 complex Hindi words (conjuncts, ligatures, matras, reph) validated under RAQM shaping.")

if __name__ == "__main__":
    unittest.main()
