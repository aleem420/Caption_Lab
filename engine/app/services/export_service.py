import math
from pathlib import Path
from typing import List
import subprocess
import shutil
import tempfile
from PIL import Image, ImageDraw, ImageFont
from app.models.schemas import CaptionModel, WordModel, ExportRequest
from app.core.config import settings

def format_srt_timestamp(seconds: float) -> str:
    """Format seconds into SRT timestamp HH:MM:SS,mmm"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int(round((seconds - int(seconds)) * 1000))
    if millis >= 1000:
        secs += 1
        millis = 0
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"

def format_vtt_timestamp(seconds: float) -> str:
    """Format seconds into WebVTT timestamp HH:MM:SS.mmm"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int(round((seconds - int(seconds)) * 1000))
    if millis >= 1000:
        secs += 1
        millis = 0
    return f"{hours:02d}:{minutes:02d}:{secs:02d}.{millis:03d}"

class ExportService:
    @staticmethod
    def generate_srt(captions: List[CaptionModel], output_path: Path) -> Path:
        """
        Exports editable native SRT file with UTF-8 encoding (supporting Devanagari).
        """
        lines = []
        for index, cap in enumerate(captions, start=1):
            start_str = format_srt_timestamp(cap.start_time)
            end_str = format_srt_timestamp(cap.end_time)
            # Combine words into line text
            text = " ".join(w.text for w in cap.words)
            lines.append(f"{index}\n{start_str} --> {end_str}\n{text}\n")
        
        content = "\n".join(lines)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(content, encoding="utf-8")
        return output_path

    @staticmethod
    def generate_vtt(captions: List[CaptionModel], output_path: Path) -> Path:
        """
        Exports native WebVTT file with UTF-8 encoding.
        """
        lines = ["WEBVTT\n"]
        for index, cap in enumerate(captions, start=1):
            start_str = format_vtt_timestamp(cap.start_time)
            end_str = format_vtt_timestamp(cap.end_time)
            text = " ".join(w.text for w in cap.words)
            lines.append(f"{index}\n{start_str} --> {end_str}\n{text}\n")
            
        content = "\n".join(lines)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(content, encoding="utf-8")
        return output_path

    @staticmethod
    def render_transparent_prores_mov(
        request: ExportRequest,
        output_path: Path,
        progress_callback = None
    ) -> Path:
        """
        Renders transparent Apple ProRes 4444 MOV with alpha channel (yuva444p10le).
        Preserves frame accuracy, Hindi typography, and active word highlights (PRD Section 16).
        """
        width = request.resolution.get("width", 1920)
        height = request.resolution.get("height", 1080)
        fps = request.fps or 30.0
        
        # Calculate total duration from captions
        if not request.captions:
            raise ValueError("No captions provided for export.")
            
        total_duration = max(c.end_time for c in request.captions)
        total_frames = int(math.ceil(total_duration * fps))
        
        temp_dir = Path(tempfile.mkdtemp(prefix="captionlab_render_"))
        try:
            # Render PNG frames with alpha transparency (RGBA)
            # Try to load a Hindi Devanagari font or fallback to default
            font = None
            font_size = int(height * 0.045) # ~48px for 1080p
            font_candidates = [
                "C:/Windows/Fonts/Nirmala.ttf",
                "C:/Windows/Fonts/mangal.ttf",
                "C:/Windows/Fonts/arial.ttf",
                "Nirmala.ttf",
                "mangal.ttf"
            ]
            for candidate in font_candidates:
                try:
                    font = ImageFont.truetype(candidate, size=font_size)
                    break
                except Exception:
                    continue
            if font is None:
                font = ImageFont.load_default()

            for frame_idx in range(total_frames):
                current_time = frame_idx / fps
                
                # Create transparent image (0 alpha)
                img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
                draw = ImageDraw.Draw(img)
                
                # Find active caption
                active_cap = next(
                    (c for c in request.captions if c.start_time <= current_time <= c.end_time),
                    None
                )
                
                if active_cap:
                    # Calculate position using normalized coordinates
                    pos_x = int(active_cap.coordinates.x * width)
                    pos_y = int(active_cap.coordinates.y * height)
                    
                    # Word animation check
                    words_text = []
                    for w in active_cap.words:
                        words_text.append(w.text)
                    full_text = " ".join(words_text)
                    
                    # Bounding box of full text
                    try:
                        bbox = draw.textbbox((0, 0), full_text, font=font)
                        text_w = bbox[2] - bbox[0]
                        text_h = bbox[3] - bbox[1]
                    except Exception:
                        text_w = len(full_text) * (font_size * 0.5)
                        text_h = font_size
                    
                    start_x = pos_x - (text_w // 2)
                    start_y = pos_y - (text_h // 2)
                    
                    # Background Box if enabled
                    if active_cap.background.enabled or active_cap.layout_family == "boxed":
                        pad_x = int(active_cap.background.padding_x or 20)
                        pad_y = int(active_cap.background.padding_y or 10)
                        bg_opacity = int(active_cap.background.opacity * 255)
                        box_coords = [
                            start_x - pad_x,
                            start_y - pad_y,
                            start_x + text_w + pad_x,
                            start_y + text_h + pad_y
                        ]
                        draw.rounded_rectangle(
                            box_coords,
                            radius=int(active_cap.background.border_radius or 8),
                            fill=(0, 0, 0, bg_opacity)
                        )
                    
                    # Render words sequentially with word-pop / karaoke highlight
                    curr_x = start_x
                    for w in active_cap.words:
                        word_str = w.text + " "
                        try:
                            w_bbox = draw.textbbox((0, 0), word_str, font=font)
                            word_w = w_bbox[2] - w_bbox[0]
                        except Exception:
                            word_w = len(word_str) * (font_size * 0.5)
                            
                        is_active_word = (w.start <= current_time <= w.end)
                        
                        # Highlighting / Karaoke color
                        if is_active_word:
                            color = (255, 223, 0, 255) # Bright Yellow Highlight
                        elif w.custom_color:
                            color = (255, 255, 255, 255)
                        else:
                            color = (255, 255, 255, 255)
                            
                        # Stroke / Outline
                        stroke_w = int(active_cap.typography.stroke_width or 3)
                        draw.text(
                            (curr_x, start_y),
                            word_str,
                            font=font,
                            fill=color,
                            stroke_width=stroke_w,
                            stroke_fill=(0, 0, 0, 255)
                        )
                        curr_x += word_w
                
                # Save frame
                frame_filename = temp_dir / f"frame_{frame_idx:06d}.png"
                img.save(frame_filename, "PNG")
                
                if progress_callback and frame_idx % 30 == 0:
                    progress_callback(frame_idx / total_frames)
            
            # Encode frames into Apple ProRes 4444 MOV with alpha
            output_path.parent.mkdir(parents=True, exist_ok=True)
            input_pattern = str(temp_dir / "frame_%06d.png")
            
            ffmpeg_cmd = [
                "ffmpeg",
                "-y",
                "-framerate", str(fps),
                "-i", input_pattern,
                "-c:v", "prores_ks",
                "-profile:v", "4",  # ProRes 4444
                "-pix_fmt", "yuva444p10le",
                str(output_path)
            ]
            
            res = subprocess.run(ffmpeg_cmd, capture_output=True, text=True)
            if res.returncode != 0:
                raise RuntimeError(f"FFmpeg ProRes encoding failed: {res.stderr}")
                
            return output_path
        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)
