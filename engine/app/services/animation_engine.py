import math
from typing import Dict, Any, Tuple, Optional, List
from app.models.schemas import CaptionModel, WordModel

class AnimationEngine:
    """
    Parametric Motion Graphics & Animation Engine for CaptionLab (Milestone 5).
    Provides frame-accurate, deterministic mathematical interpolation for both
    offline PIL ProRes/PNG export and real-time canvas preview.
    """

    # --- EASING FUNCTIONS ---

    @staticmethod
    def linear(t: float) -> float:
        return max(0.0, min(1.0, t))

    @staticmethod
    def ease_in_quad(t: float) -> float:
        t = max(0.0, min(1.0, t))
        return t * t

    @staticmethod
    def ease_out_quad(t: float) -> float:
        t = max(0.0, min(1.0, t))
        return t * (2.0 - t)

    @staticmethod
    def ease_in_out_quad(t: float) -> float:
        t = max(0.0, min(1.0, t))
        if t < 0.5:
            return 2.0 * t * t
        return -1.0 + (4.0 - 2.0 * t) * t

    @staticmethod
    def cubic_ease_out(t: float) -> float:
        t = max(0.0, min(1.0, t))
        return 1.0 - math.pow(1.0 - t, 3)

    @staticmethod
    def cubic_ease_in(t: float) -> float:
        t = max(0.0, min(1.0, t))
        return math.pow(t, 3)

    @staticmethod
    def bounce_out(t: float) -> float:
        t = max(0.0, min(1.0, t))
        n1 = 7.5625
        d1 = 2.75

        if t < 1.0 / d1:
            return n1 * t * t
        elif t < 2.0 / d1:
            t -= 1.5 / d1
            return n1 * t * t + 0.75
        elif t < 2.5 / d1:
            t -= 2.25 / d1
            return n1 * t * t + 0.9375
        else:
            t -= 2.625 / d1
            return n1 * t * t + 0.984375

    @classmethod
    def evaluate_easing(cls, name: str, t: float) -> float:
        """Evaluates named easing curve with clamping."""
        name_lower = (name or "linear").lower().replace("-", "_")
        if name_lower in ("cubic", "cubic_ease_out", "pop_in"):
            return cls.cubic_ease_out(t)
        elif name_lower in ("ease_in", "ease_in_quad"):
            return cls.ease_in_quad(t)
        elif name_lower in ("ease_out", "ease_out_quad"):
            return cls.ease_out_quad(t)
        elif name_lower in ("ease_in_out", "ease_in_out_quad"):
            return cls.ease_in_out_quad(t)
        elif name_lower in ("bounce", "bounce_out"):
            return cls.bounce_out(t)
        return cls.linear(t)

    # --- CAPTION TRANSFORM CALCULATIONS ---

    @classmethod
    def get_caption_transform(
        cls,
        caption: CaptionModel,
        current_time: float,
        fps: float = 30.0
    ) -> Dict[str, Any]:
        """
        Calculates group-level entrance, exit, and emphasis transformations.
        Returns scale (X, Y), opacity, and position offsets.
        """
        # Default identity state
        result = {
            "scale_x": 1.0,
            "scale_y": 1.0,
            "opacity": 1.0,
            "offset_x": 0.0,
            "offset_y": 0.0,
            "rotation": 0.0
        }

        if current_time < caption.start_time or current_time >= caption.end_time:
            result["opacity"] = 0.0
            return result

        rel_time = current_time - caption.start_time
        time_to_end = caption.end_time - current_time

        # 1. Entrance Transformation
        ent_cfg = caption.animation.entrance if caption.animation else {"type": "pop_in", "duration_frames": 4}
        ent_type = ent_cfg.get("type", "pop_in")
        ent_frames = int(ent_cfg.get("duration_frames", 4))
        ent_dur = max(0.001, ent_frames / fps)

        if rel_time < ent_dur and ent_frames > 0:
            p = rel_time / ent_dur
            if ent_type in ("pop_in", "fade_in"):
                # 0.80x -> 1.0x cubic ease-out
                ease_val = cls.cubic_ease_out(p)
                s = 0.80 + 0.20 * ease_val
                result["scale_x"] = s
                result["scale_y"] = s
            elif ent_type == "slide_in":
                ease_val = cls.ease_out_quad(p)
                result["offset_y"] = 25.0 * (1.0 - ease_val)
            elif ent_type == "bounce_in":
                ease_val = cls.bounce_out(p)
                s = 0.60 + 0.40 * ease_val
                result["scale_x"] = s
                result["scale_y"] = s

        # 2. Exit Transformation
        exit_cfg = caption.animation.exit if caption.animation else {"type": "fade_out", "duration_frames": 4}
        exit_type = exit_cfg.get("type", "fade_out")
        exit_frames = int(exit_cfg.get("duration_frames", 4))
        exit_dur = max(0.001, exit_frames / fps)

        if time_to_end < exit_dur and exit_frames > 0:
            p_exit = max(0.0, min(1.0, time_to_end / exit_dur))
            if exit_type in ("fade_out", "fade"):
                result["opacity"] = min(result["opacity"], p_exit)
            elif exit_type == "shrink":
                s = 0.80 + 0.20 * p_exit
                result["scale_x"] = min(result["scale_x"], s)
                result["scale_y"] = min(result["scale_y"], s)
                result["opacity"] = min(result["opacity"], p_exit)
            elif exit_type == "slide_out":
                result["offset_y"] = -20.0 * (1.0 - p_exit)
                result["opacity"] = min(result["opacity"], p_exit)

        return result

    # --- WORD TRANSFORM CALCULATIONS ---

    @classmethod
    def get_word_transform(
        cls,
        word: WordModel,
        current_time: float,
        word_anim_config: Optional[Dict[str, Any]] = None,
        default_color: str = "#FFFFFF"
    ) -> Dict[str, Any]:
        """
        Calculates atomic word-level scale, color, and vertical offset.
        Strictly observes half-open interval: word.start <= current_time < word.end.
        """
        anim_cfg = word_anim_config or {
            "type": "karaoke_highlight",
            "active_color": "#FFDF00",
            "inactive_color": "#FFFFFF",
            "active_scale": 1.15
        }

        anim_type = anim_cfg.get("type", "karaoke_highlight")
        active_color = word.custom_color or anim_cfg.get("active_color", "#FFDF00")
        inactive_color = anim_cfg.get("inactive_color", default_color or "#FFFFFF")
        target_scale = float(word.custom_scale or anim_cfg.get("active_scale", 1.15))

        # Check half-open activity
        is_active = (word.start <= current_time < word.end)

        result = {
            "is_active": is_active,
            "scale": 1.0,
            "color": active_color if is_active else inactive_color,
            "offset_y": 0.0,
            "opacity": 1.0
        }

        if not is_active:
            # Check sequential reveal: if word has not yet been spoken, hide it
            if anim_type == "sequential_reveal" and current_time < word.start:
                result["opacity"] = 0.0
            return result

        # Word is active: calculate dynamic interpolation curve
        w_dur = max(0.01, word.end - word.start)
        t_rel = current_time - word.start
        t_rem = word.end - current_time

        if anim_type in ("karaoke_highlight", "active_word_highlight"):
            # Smooth attack & decay curve
            attack_dur = min(0.08, w_dur / 3.0)
            decay_dur = min(0.08, w_dur / 3.0)

            if t_rel < attack_dur:
                p = t_rel / attack_dur
                ease_p = 1.0 - (1.0 - p) * (1.0 - p)
                result["scale"] = 1.0 + (target_scale - 1.0) * ease_p
            elif t_rem < decay_dur:
                p = t_rem / decay_dur
                ease_p = 1.0 - (1.0 - p) * (1.0 - p)
                result["scale"] = 1.0 + (target_scale - 1.0) * ease_p
            else:
                result["scale"] = target_scale

        elif anim_type in ("word_pop", "scale_bounce"):
            # Elastic bounce pop
            p = min(1.0, t_rel / min(0.20, w_dur))
            bounce_p = cls.bounce_out(p)
            result["scale"] = 1.0 + (target_scale - 1.0) * bounce_p
            result["offset_y"] = -4.0 * math.sin(p * math.pi)

        elif anim_type == "slide_up":
            p = min(1.0, t_rel / min(0.15, w_dur))
            ease_p = cls.ease_out_quad(p)
            result["offset_y"] = 8.0 * (1.0 - ease_p)
            result["scale"] = 1.0 + (target_scale - 1.0) * ease_p

        else:
            result["scale"] = target_scale

        return result

animation_engine = AnimationEngine()
