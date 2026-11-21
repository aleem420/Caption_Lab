import math
from typing import List, Optional
from app.models.schemas import (
    WordModel,
    CaptionModel,
    TypographyModel,
    BackgroundModel,
    NormalizedCoordinatesModel,
    AnimationConfigModel
)

class CaptionLayoutEngine:
    """
    Dynamic Layout Engine for Hindi & Hinglish captions (PRD Section 10).
    Calculates natural text grouping, line breaking, and visual balance.
    Respects Property Provenance: protects manual USER edits from being overwritten.
    """
    
    @staticmethod
    def get_layout_defaults(layout_family: str):
        coords = NormalizedCoordinatesModel(x=0.5, y=0.82, width=0.85, height=0.15)
        bg = BackgroundModel(enabled=(layout_family == "boxed"))
        typo = TypographyModel()

        if layout_family == "single_line":
            coords.y = 0.85
            coords.height = 0.10
        elif layout_family == "stacked":
            coords.y = 0.80
            coords.height = 0.18
        elif layout_family == "keyword_highlight":
            coords.y = 0.80
            coords.height = 0.15
        elif layout_family == "word_by_word":
            coords.y = 0.82
            coords.height = 0.12
            coords.width = 0.70
        elif layout_family == "speaker_based":
            coords.y = 0.80
            coords.x = 0.40
            coords.width = 0.80
        elif layout_family == "boxed":
            bg.enabled = True
            bg.color = "#111827"
            bg.opacity = 0.85
            bg.border_radius = 10
            bg.padding_x = 24
            bg.padding_y = 12
        elif layout_family == "cinematic":
            coords.y = 0.88
            coords.height = 0.10
            typo.font_family = "Noto Serif Devanagari"
            typo.letter_spacing = 1.5

        return coords, bg, typo

    @staticmethod
    def clamp_to_safe_area(coords: NormalizedCoordinatesModel, aspect_ratio: str = "16:9") -> NormalizedCoordinatesModel:
        if aspect_ratio == "9:16":
            min_y, max_y = 0.15, 0.80
        else:
            min_y, max_y = 0.10, 0.90

        clamped_x = max(0.10, min(0.90, coords.x))
        clamped_y = max(min_y, min(max_y, coords.y))
        clamped_w = max(0.20, min(0.85, coords.width))
        clamped_h = max(0.05, min(0.40, coords.height))

        return NormalizedCoordinatesModel(
            x=round(clamped_x, 3),
            y=round(clamped_y, 3),
            width=round(clamped_w, 3),
            height=round(clamped_h, 3)
        )

    @staticmethod
    def group_words_into_captions(
        words: List[WordModel],
        max_words_per_caption: int = 5,
        max_duration: float = 3.5,
        min_duration: float = 0.8,
        fps: float = 30.0,
        layout_family: str = "balanced_two_line"
    ) -> List[CaptionModel]:
        """
        Groups words into readable caption segments based on reading speed and natural pauses.
        """
        if not words:
            return []

        # Family-aware word limit tuning
        if layout_family in ("single_line", "keyword_highlight"):
            effective_max_words = min(max_words_per_caption, 4)
        elif layout_family == "word_by_word":
            effective_max_words = 2
            min_duration = 0.3
        else:
            effective_max_words = max_words_per_caption

        captions: List[CaptionModel] = []
        current_chunk: List[WordModel] = []
        caption_idx = 1
        
        for i, word in enumerate(words):
            current_chunk.append(word)
            chunk_duration = current_chunk[-1].end - current_chunk[0].start
            is_punctuation = word.text.endswith((".", "!", "?", "।", "|"))
            is_max_words = len(current_chunk) >= effective_max_words
            is_max_duration = chunk_duration >= max_duration
            is_last = (i == len(words) - 1)
            
            # Check pause to next word
            is_pause = False
            if not is_last:
                pause_time = words[i + 1].start - word.end
                if pause_time >= 0.45:
                    is_pause = True
            
            if (is_punctuation or is_max_words or is_max_duration or is_pause or is_last) and chunk_duration >= min_duration:
                start_time = current_chunk[0].start
                end_time = current_chunk[-1].end
                duration = round(end_time - start_time, 2)
                
                # Deterministic frame timing
                start_frame = int(round(start_time * fps))
                end_frame = int(round(end_time * fps))
                
                # Layout specific defaults
                coords, bg, typo = CaptionLayoutEngine.get_layout_defaults(layout_family)
                
                caption = CaptionModel(
                    caption_id=f"cap_{caption_idx:03d}",
                    start_frame=start_frame,
                    end_frame=end_frame,
                    start_time=start_time,
                    end_time=end_time,
                    duration=duration,
                    words=list(current_chunk),
                    layout_family=layout_family,
                    coordinates=coords,
                    typography=typo,
                    background=bg,
                    animation=AnimationConfigModel()
                )
                captions.append(caption)
                caption_idx += 1
                current_chunk = []
                
        # Handle trailing words
        if current_chunk:
            start_time = current_chunk[0].start
            end_time = current_chunk[-1].end
            coords, bg, typo = CaptionLayoutEngine.get_layout_defaults(layout_family)
            captions.append(
                CaptionModel(
                    caption_id=f"cap_{caption_idx:03d}",
                    start_frame=int(round(start_time * fps)),
                    end_frame=int(round(end_time * fps)),
                    start_time=start_time,
                    end_time=end_time,
                    duration=round(end_time - start_time, 2),
                    words=list(current_chunk),
                    layout_family=layout_family,
                    coordinates=coords,
                    typography=typo,
                    background=bg,
                    animation=AnimationConfigModel()
                )
            )
            
        return captions

    @staticmethod
    def wrap_words_into_lines(words: List[WordModel], max_chars_per_line: int = 36) -> List[List[WordModel]]:
        """
        Dynamically wraps words into balanced lines without breaking atomic Hindi words or matras (Milestone 5).
        """
        if not words:
            return []
        
        lines: List[List[WordModel]] = []
        current_line: List[WordModel] = []
        current_len = 0
        
        for w in words:
            word_len = len(w.text)
            needed_space = 1 if current_line else 0
            if current_line and (current_len + needed_space + word_len) > max_chars_per_line:
                lines.append(current_line)
                current_line = [w]
                current_len = word_len
            else:
                current_line.append(w)
                current_len += needed_space + word_len
                
        if current_line:
            lines.append(current_line)
            
        return lines

    @staticmethod
    def apply_style_preset(caption: CaptionModel, preset_data: dict) -> CaptionModel:
        """
        Applies a style preset while strictly preserving user-overridden properties (PRD Section 9.10).
        """
        user_overrides = set(caption.user_overridden_properties)
        
        if "layout_family" in preset_data and "layout_family" not in user_overrides:
            caption.layout_family = preset_data["layout_family"]
            
        if "typography" in preset_data:
            for k, v in preset_data["typography"].items():
                if f"typography.{k}" not in user_overrides and hasattr(caption.typography, k):
                    setattr(caption.typography, k, v)
                    
        if "background" in preset_data:
            for k, v in preset_data["background"].items():
                if f"background.{k}" not in user_overrides and hasattr(caption.background, k):
                    setattr(caption.background, k, v)
                    
        if "coordinates" in preset_data:
            for k, v in preset_data["coordinates"].items():
                if f"coordinates.{k}" not in user_overrides and hasattr(caption.coordinates, k):
                    setattr(caption.coordinates, k, v)
                    
        return caption

layout_engine = CaptionLayoutEngine()
