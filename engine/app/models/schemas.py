from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field

class WordModel(BaseModel):
    word_id: str
    text: str
    start: float = Field(ge=0.0)
    end: float = Field(ge=0.0)
    confidence: Optional[float] = None
    speaker_id: Optional[str] = None
    corrected: bool = False
    custom_color: Optional[str] = None
    custom_scale: Optional[float] = None
    custom_highlight: Optional[bool] = None
    custom_stroke: Optional[str] = None

class SentenceModel(BaseModel):
    sentence_id: str
    speaker_id: Optional[str] = None
    start: float
    end: float
    text: str
    words: List[WordModel] = []

class TypographyModel(BaseModel):
    font_family: str = "Noto Sans Devanagari"
    font_weight: str = "700"
    font_size: float = 48.0
    line_height: float = 1.2
    letter_spacing: float = 0.0
    alignment: Literal["left", "center", "right"] = "center"
    text_transform: Literal["none", "uppercase", "lowercase"] = "none"
    color: str = "#FFFFFF"
    stroke_color: Optional[str] = "#000000"
    stroke_width: Optional[float] = 4.0
    shadow_color: Optional[str] = "rgba(0,0,0,0.7)"
    shadow_blur: Optional[float] = 8.0
    shadow_offset_x: Optional[float] = 2.0
    shadow_offset_y: Optional[float] = 2.0

class BackgroundModel(BaseModel):
    enabled: bool = False
    color: str = "#000000"
    opacity: float = 0.75
    border_radius: float = 8.0
    padding_x: float = 16.0
    padding_y: float = 8.0
    border_color: Optional[str] = None
    border_width: Optional[float] = 0.0

class NormalizedCoordinatesModel(BaseModel):
    x: float = 0.5
    y: float = 0.82
    width: float = 0.85
    height: float = 0.15

class AnimationConfigModel(BaseModel):
    entrance: Dict[str, Any] = Field(default_factory=lambda: {"type": "fade_in", "duration_frames": 6})
    emphasis: Dict[str, Any] = Field(default_factory=lambda: {"type": "none", "duration_frames": 0})
    exit: Dict[str, Any] = Field(default_factory=lambda: {"type": "fade_out", "duration_frames": 4})
    word_animation: Dict[str, Any] = Field(default_factory=lambda: {
        "type": "karaoke_highlight",
        "active_color": "#FFDF00",
        "inactive_color": "#FFFFFF",
        "active_scale": 1.15
    })

class CaptionModel(BaseModel):
    caption_id: str
    start_frame: int = 0
    end_frame: int = 0
    start_time: float
    end_time: float
    duration: float
    words: List[WordModel]
    text_blocks: List[Dict[str, Any]] = []
    layers: List[Dict[str, Any]] = []
    layout_family: Literal[
        "single_line",
        "balanced_two_line",
        "stacked",
        "keyword_highlight",
        "word_by_word",
        "speaker_based",
        "boxed",
        "cinematic"
    ] = "balanced_two_line"
    coordinates: NormalizedCoordinatesModel = Field(default_factory=NormalizedCoordinatesModel)
    typography: TypographyModel = Field(default_factory=TypographyModel)
    background: BackgroundModel = Field(default_factory=BackgroundModel)
    animation: AnimationConfigModel = Field(default_factory=AnimationConfigModel)
    user_overridden_properties: List[str] = []

class TranscribeRequest(BaseModel):
    audio_path: str
    language: str = "hi"
    model_size: Literal["tiny", "base", "small", "medium", "large"] = "base"
    device: Literal["cpu", "cuda"] = "cpu"
    word_timestamps: bool = True
    vad_filter: bool = True

class TranscribeResponse(BaseModel):
    language: str
    model_size: str
    duration: float
    sentences: List[SentenceModel]
    words: List[WordModel]

class ExportRequest(BaseModel):
    output_type: Literal["srt", "vtt", "prores_4444", "png_sequence", "both"]
    captions: List[CaptionModel]
    resolution: Dict[str, int] = Field(default_factory=lambda: {"width": 1920, "height": 1080})
    fps: float = 30.0
    filename_prefix: str = "captionlab_export"
    output_directory: Optional[str] = None
    render_background_transparency: bool = True
