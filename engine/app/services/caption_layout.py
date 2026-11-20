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
            
        captions: List[CaptionModel] = []
        current_chunk: List[WordModel] = []
        caption_idx = 1
        
        for i, word in enumerate(words):
            current_chunk.append(word)
            chunk_duration = current_chunk[-1].end - current_chunk[0].start
            is_punctuation = word.text.endswith((".", "!", "?", "।", "|"))
            is_max_words = len(current_chunk) >= max_words_per_caption
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
                coords = NormalizedCoordinatesModel(x=0.5, y=0.82, width=0.85, height=0.15)
                bg = BackgroundModel(enabled=(layout_family == "boxed"))
                
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
                    typography=TypographyModel(),
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
                    coordinates=NormalizedCoordinatesModel(),
                    typography=TypographyModel(),
                    background=BackgroundModel(enabled=(layout_family == "boxed")),
                    animation=AnimationConfigModel()
                )
            )
            
        return captions

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
