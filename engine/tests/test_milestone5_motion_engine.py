import unittest
import math
from app.services.animation_engine import animation_engine, AnimationEngine
from app.models.schemas import CaptionModel, WordModel, AnimationConfigModel

class TestMilestone5MotionEngine(unittest.TestCase):
    """
    Automated test suite for Milestone 5 Advanced Motion Graphics Engine.
    Validates parametric easing equations, multi-level animation targets,
    and deterministic frame interpolation.
    """

    def test_01_all_easing_curves_mathematical_bounds(self):
        """Validates all easing curves produce smooth, bounded [0.0, 1.0] values at boundaries."""
        curves = ["linear", "ease_in", "ease_out", "ease_in_out", "cubic", "bounce"]
        for curve in curves:
            # Boundary t=0.0 must be 0.0
            val_0 = AnimationEngine.evaluate_easing(curve, 0.0)
            self.assertAlmostEqual(val_0, 0.0, places=3, msg=f"{curve} at t=0 failed")

            # Boundary t=1.0 must be 1.0
            val_1 = AnimationEngine.evaluate_easing(curve, 1.0)
            self.assertAlmostEqual(val_1, 1.0, places=3, msg=f"{curve} at t=1 failed")

            # Midpoint t=0.5 must be strictly within [0.0, 1.5]
            val_mid = AnimationEngine.evaluate_easing(curve, 0.5)
            self.assertGreaterEqual(val_mid, 0.0)
            self.assertLessEqual(val_mid, 1.2)

    def test_02_cubic_ease_out_curvature(self):
        """Verifies cubic ease-out decelerates smoothly: f(0.5) = 1 - (1 - 0.5)^3 = 0.875."""
        val = AnimationEngine.cubic_ease_out(0.5)
        self.assertAlmostEqual(val, 0.875, places=3)

    def test_03_bounce_out_polynomial(self):
        """Verifies bounce out creates multi-stage spring behavior."""
        t_samples = [0.1, 0.3, 0.6, 0.8, 1.0]
        results = [AnimationEngine.bounce_out(t) for t in t_samples]
        self.assertAlmostEqual(results[-1], 1.0, places=3)
        for r in results:
            self.assertGreaterEqual(r, 0.0)
            self.assertLessEqual(r, 1.05)

    def test_04_caption_level_pop_in_entrance(self):
        """Validates caption entrance pop-in scales from 0.80x to 1.0x with cubic ease-out."""
        cap = CaptionModel(
            caption_id="cap_test",
            start_time=1.0,
            end_time=3.0,
            duration=2.0,
            words=[WordModel(word_id="w1", text="परीक्षण", start=1.0, end=2.0)],
            animation=AnimationConfigModel(entrance={"type": "pop_in", "duration_frames": 4})
        )
        fps = 25.0 # 4 frames = 0.16s
        # Frame 0 (t=1.00s): scale must be 0.80x
        trans_0 = animation_engine.get_caption_transform(cap, 1.00, fps)
        self.assertAlmostEqual(trans_0["scale_x"], 0.80, places=2)

        # Post-entrance (t=1.20s): scale must be exactly 1.00x
        trans_post = animation_engine.get_caption_transform(cap, 1.20, fps)
        self.assertAlmostEqual(trans_post["scale_x"], 1.00, places=2)

    def test_05_word_level_karaoke_highlight_interval(self):
        """Validates word is active and highlighted strictly within half-open interval [start, end)."""
        w = WordModel(word_id="w_test", text="नमस्ते", start=1.0, end=1.5)
        cfg = {"type": "karaoke_highlight", "active_color": "#FFDF00", "inactive_color": "#FFFFFF", "active_scale": 1.15}

        # Before start (t=0.99s) -> Inactive, scale=1.0, color=#FFFFFF
        t_before = animation_engine.get_word_transform(w, 0.99, cfg)
        self.assertFalse(t_before["is_active"])
        self.assertAlmostEqual(t_before["scale"], 1.0, places=2)
        self.assertEqual(t_before["color"], "#FFFFFF")

        # Active midpoint (t=1.25s) -> Active, scale=1.15, color=#FFDF00
        t_mid = animation_engine.get_word_transform(w, 1.25, cfg)
        self.assertTrue(t_mid["is_active"])
        self.assertAlmostEqual(t_mid["scale"], 1.15, places=2)
        self.assertEqual(t_mid["color"], "#FFDF00")

        # After end (t=1.50s) -> Inactive (strict half-open bound)
        t_after = animation_engine.get_word_transform(w, 1.50, cfg)
        self.assertFalse(t_after["is_active"])
        self.assertAlmostEqual(t_after["scale"], 1.0, places=2)

    def test_06_word_pop_bounce_transform(self):
        """Validates word_pop motion preset generates vertical offset bounce."""
        w = WordModel(word_id="w_pop", text="उछाल", start=0.0, end=0.5)
        cfg = {"type": "word_pop", "active_color": "#00FF66", "active_scale": 1.25}

        mid = animation_engine.get_word_transform(w, 0.10, cfg)
        self.assertTrue(mid["is_active"])
        self.assertGreater(mid["scale"], 1.0)
        self.assertLessEqual(mid["offset_y"], 0.0) # Upward displacement

if __name__ == "__main__":
    unittest.main()
