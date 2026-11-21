import math
from pathlib import Path
from typing import List, Dict, Any, Optional
import subprocess
import shutil
import tempfile
from PIL import Image, ImageDraw, ImageFont
from app.models.schemas import CaptionModel, WordModel, ExportRequest
from app.core.config import settings
from app.services.font_service import font_service
from app.services.animation_engine import animation_engine

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
    def _render_frames(request: ExportRequest, target_dir: Path, progress_callback = None) -> int:
        """
        Internal renderer that produces 32-bit RGBA PNG frames with Hindi text shaping,
        word-level geometric scaling (up to 1.15x), caption-level entrance pop-in
        (0.80x to 1.0x), smooth alpha fade-out, deterministic half-open intervals
        [start_time, end_time), and background boxes (Milestone 3.2).
        Returns total frame count.
        """
        width = request.resolution.get("width", 1920)
        height = request.resolution.get("height", 1080)
        fps = request.fps or 30.0
        
        if not request.captions:
            raise ValueError("No captions provided for export.")
            
        total_duration = max(c.end_time for c in request.captions)
        total_frames = int(math.ceil(total_duration * fps))

        # Font caching with FontService and robust fallbacks
        font_cache = {}
        
        def get_font(family: str, size: int):
            cache_key = f"{family}_{size}"
            if cache_key in font_cache:
                return font_cache[cache_key]
            f = font_service.load_font(family, size)
            font_cache[cache_key] = f
            return f

        # Pre-layout stable positions for each caption
        # Pre-computing word centers ensures inactive words remain stationary
        # and reserves space for the maximum scale without collision
        caption_layouts = {}
        for cap in request.captions:
            cap_font_size = int(round(cap.typography.font_size)) if (cap.typography and cap.typography.font_size) else int(height * 0.045)
            cap_font_family = cap.typography.font_family if cap.typography else "Noto Sans Devanagari"
            base_font = get_font(cap_font_family, cap_font_size)
            try:
                ascent, descent = base_font.getmetrics()
            except Exception:
                ascent, descent = int(cap_font_size * 0.8), int(cap_font_size * 0.2)
                
            stroke_w = int(round(cap.typography.stroke_width)) if (cap.typography and cap.typography.stroke_width is not None) else 3
            max_scale = float(cap.animation.word_animation.get("active_scale", 1.15)) if (cap.animation and cap.animation.word_animation) else 1.15
            
            dummy_img = Image.new("RGBA", (10, 10))
            dummy_draw = ImageDraw.Draw(dummy_img)
            
            # Measure each atomic word cluster
            word_metrics = []
            for w in cap.words:
                text = w.text
                try:
                    bbox = dummy_draw.textbbox((0, 0), text, font=base_font, stroke_width=stroke_w)
                    bw = bbox[2] - bbox[0]
                    bh = bbox[3] - bbox[1]
                except Exception:
                    bw = int(len(text) * cap_font_size * 0.5)
                    bh = cap_font_size
                    bbox = (0, 0, bw, bh)
                word_metrics.append({"text": text, "bw": bw, "bh": bh, "bbox": bbox})
                
            space_bbox = dummy_draw.textbbox((0, 0), " ", font=base_font)
            space_w = max(10, space_bbox[2] - space_bbox[0])
            
            # Slot width: reserved spacing for max_scale (1.15x) so scaling never collides
            slot_widths = [int(round(m["bw"] * max_scale)) for m in word_metrics]
            total_w = sum(slot_widths) + (len(cap.words) - 1) * space_w
            line_h = max((m["bh"] for m in word_metrics), default=cap_font_size)
            
            pos_x = int(cap.coordinates.x * width)
            pos_y = int(cap.coordinates.y * height)
            start_x = pos_x - (total_w // 2)
            
            # Fixed word centers
            word_centers = []
            curr_x = start_x
            for sw in slot_widths:
                c_x = curr_x + (sw // 2)
                word_centers.append(c_x)
                curr_x += sw + space_w
                
            caption_layouts[cap.caption_id] = {
                "font_size": cap_font_size,
                "base_font": base_font,
                "ascent": ascent,
                "descent": descent,
                "stroke_w": stroke_w,
                "max_scale": max_scale,
                "word_metrics": word_metrics,
                "word_centers": word_centers,
                "total_w": total_w,
                "line_h": line_h,
                "pos_x": pos_x,
                "pos_y": pos_y,
                "start_x": start_x
            }

        # Render frames
        for frame_idx in range(total_frames):
            current_time = frame_idx / fps
            img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
            
            # Deterministic half-open interval: start_time <= current_time < end_time
            active_cap = next(
                (c for c in request.captions if c.start_time <= current_time < c.end_time),
                None
            )
            
            if active_cap:
                layout = caption_layouts[active_cap.caption_id]
                pos_x = layout["pos_x"]
                pos_y = layout["pos_y"]
                base_font = layout["base_font"]
                ascent = layout["ascent"]
                stroke_w = layout["stroke_w"]
                max_scale = layout["max_scale"]
                word_metrics = layout["word_metrics"]
                word_centers = layout["word_centers"]
                total_w = layout["total_w"]
                line_h = layout["line_h"]
                start_x = layout["start_x"]
                
                # Offscreen caption layer
                cap_layer = Image.new("RGBA", (width, height), (0, 0, 0, 0))
                cap_draw = ImageDraw.Draw(cap_layer)
                
                # Background Box (if enabled or boxed layout)
                if active_cap.background.enabled or active_cap.layout_family == "boxed":
                    pad_x = int(active_cap.background.padding_x or 24)
                    pad_y = int(active_cap.background.padding_y or 12)
                    bg_opacity = int(active_cap.background.opacity * 255)
                    box_coords = [
                        start_x - pad_x,
                        pos_y - (line_h // 2) - pad_y,
                        start_x + total_w + pad_x,
                        pos_y + (line_h // 2) + pad_y
                    ]
                    cap_draw.rounded_rectangle(
                        box_coords,
                        radius=int(active_cap.background.border_radius or 8),
                        fill=(0, 0, 0, bg_opacity)
                    )
                
                # Target baseline position centered on pos_y
                target_baseline_y = pos_y + (ascent // 4)
                
                # Transformation Step 1 & 2: Render word glyphs + apply geometric scaling
                for i, w in enumerate(active_cap.words):
                    m = word_metrics[i]
                    orig_bw = m["bw"]
                    orig_bh = m["bh"]
                    orig_bbox = m["bbox"]
                    center_x = word_centers[i]
                    
                    # Strict half-open word interval & animation transform via AnimationEngine
                    w_trans = animation_engine.get_word_transform(
                        word=w,
                        current_time=current_time,
                        word_anim_config=active_cap.animation.word_animation if active_cap.animation else None,
                        default_color=active_cap.typography.color if active_cap.typography else "#FFFFFF"
                    )
                    is_active_word = w_trans["is_active"]
                    word_scale = w_trans["scale"]
                    word_offset_y = w_trans.get("offset_y", 0.0)
                    word_opacity = w_trans.get("opacity", 1.0)
                    
                    if word_opacity <= 0.0:
                        continue
                        
                    c_hex = w_trans["color"]
                    if c_hex and c_hex.startswith("#") and len(c_hex) == 7:
                        r = int(c_hex[1:3], 16)
                        g = int(c_hex[3:5], 16)
                        b = int(c_hex[5:7], 16)
                        text_color = (r, g, b, int(round(255 * word_opacity)))
                    else:
                        text_color = (255, 223, 0, 255) if is_active_word else (255, 255, 255, 255)
                        
                    # Render atomic word cluster to scratch buffer
                    pad = 12
                    buf_w = orig_bw + pad * 2
                    buf_h = orig_bh + pad * 2
                    word_buf = Image.new("RGBA", (buf_w, buf_h), (0, 0, 0, 0))
                    w_draw = ImageDraw.Draw(word_buf)
                    
                    # Draw complete word cluster with stroke
                    draw_x = pad - orig_bbox[0]
                    draw_y = pad - orig_bbox[1]
                    w_draw.text(
                        (draw_x, draw_y),
                        w.text,
                        font=base_font,
                        fill=text_color,
                        stroke_width=stroke_w,
                        stroke_fill=(0, 0, 0, 255)
                    )
                    
                    buf_baseline = draw_y + ascent
                    
                    # Step 2: Apply word-level geometric scaling
                    if abs(word_scale - 1.0) > 1e-3:
                        sw = int(round(buf_w * word_scale))
                        sh = int(round(buf_h * word_scale))
                        scaled_buf = word_buf.resize((sw, sh), Image.Resampling.LANCZOS)
                        scaled_baseline = buf_baseline * word_scale
                    else:
                        scaled_buf = word_buf
                        scaled_baseline = buf_baseline
                        
                    # Baseline locking & stable center alignment
                    paste_x = int(round(center_x - (scaled_buf.width / 2.0)))
                    paste_y = int(round(target_baseline_y - scaled_baseline + word_offset_y))
                    
                    # Step 3: Compose word onto caption layer
                    cap_layer.alpha_composite(scaled_buf, (paste_x, paste_y))
                
                # Transformation Step 4 & 5: Caption-level entrance & exit via AnimationEngine
                cap_trans = animation_engine.get_caption_transform(active_cap, current_time, fps)
                cap_scale = cap_trans["scale_x"]
                cap_opacity = cap_trans["opacity"]
                cap_off_x = cap_trans["offset_x"]
                cap_off_y = cap_trans["offset_y"]

                if abs(cap_scale - 1.0) > 1e-3 or abs(cap_off_x) > 1e-3 or abs(cap_off_y) > 1e-3:
                    bbox_content = cap_layer.getbbox()
                    if bbox_content:
                        cw = bbox_content[2] - bbox_content[0]
                        ch = bbox_content[3] - bbox_content[1]
                        crop = cap_layer.crop(bbox_content)
                        scaled_cw = int(round(cw * cap_scale))
                        scaled_ch = int(round(ch * cap_scale))
                        scaled_crop = crop.resize((scaled_cw, scaled_ch), Image.Resampling.LANCZOS)
                        
                        cap_layer = Image.new("RGBA", (width, height), (0, 0, 0, 0))
                        new_paste_x = int(round(pos_x + cap_off_x - (scaled_cw / 2.0)))
                        new_paste_y = int(round(pos_y + cap_off_y - (scaled_ch / 2.0)))
                        cap_layer.alpha_composite(scaled_crop, (new_paste_x, new_paste_y))

                if cap_opacity < 0.999:
                    r, g, b, a = cap_layer.split()
                    a = a.point(lambda v: int(round(v * cap_opacity)))
                    cap_layer = Image.merge("RGBA", (r, g, b, a))
                
                # Transformation Step 6: Composite the final RGBA frame
                img.alpha_composite(cap_layer)
            
            frame_filename = target_dir / f"frame_{frame_idx:06d}.png"
            img.save(frame_filename, "PNG")
            
            if progress_callback and frame_idx % 30 == 0:
                progress_callback(frame_idx / total_frames)

        return total_frames

    @staticmethod
    def render_transparent_prores_mov(
        request: ExportRequest,
        output_path: Path,
        progress_callback = None
    ) -> Path:
        """
        Renders transparent Apple ProRes 4444 MOV with alpha channel (yuva444p10le).
        Preserves frame accuracy, Hindi typography, and active word highlights (PRD Section 16 & Milestone 3 B).
        """
        fps = request.fps or 30.0
        temp_dir = Path(tempfile.mkdtemp(prefix="captionlab_render_mov_"))
        try:
            total_frames = ExportService._render_frames(request, temp_dir, progress_callback)
            output_path.parent.mkdir(parents=True, exist_ok=True)
            input_pattern = str(temp_dir / "frame_%06d.png")
            
            # Windows File Lock Protection: If target file is locked by Premiere Pro or another process,
            # iteratively find a non-colliding writable output path so export completes reliably.
            target_path = output_path
            counter = 1
            while target_path.exists():
                try:
                    with open(target_path, "ab"):
                        break  # File exists and is unlocked/writable
                except PermissionError:
                    suffix = output_path.suffix
                    stem = output_path.stem
                    target_path = output_path.with_name(f"{stem}_updated_{counter}{suffix}")
                    counter += 1

            ffmpeg_cmd = [
                "ffmpeg",
                "-y",
                "-framerate", str(fps),
                "-i", input_pattern,
                "-c:v", "prores_ks",
                "-profile:v", "4",  # ProRes 4444
                "-pix_fmt", "yuva444p10le",
                str(target_path)
            ]
            
            res = subprocess.run(ffmpeg_cmd, capture_output=True, text=True)
            if res.returncode != 0:
                raise RuntimeError(f"FFmpeg ProRes encoding failed: {res.stderr}")
                
            return target_path
        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)

    @staticmethod
    def render_png_sequence(
        request: ExportRequest,
        output_dir: Path,
        progress_callback = None
    ) -> Dict[str, Any]:
        """
        Renders transparent 32-bit RGBA PNG sequence (PRD Section 16 & Milestone 3 C).
        Frame numbering: frame_%06d.png
        Includes missing-frame detection & sequence duration validation.
        """
        output_dir.mkdir(parents=True, exist_ok=True)
        total_frames = ExportService._render_frames(request, output_dir, progress_callback)
        
        # Missing frame verification
        missing_frames = []
        for i in range(total_frames):
            frame_path = output_dir / f"frame_{i:06d}.png"
            if not frame_path.exists() or frame_path.stat().st_size == 0:
                missing_frames.append(i)
                
        if missing_frames:
            raise RuntimeError(f"PNG Sequence export corrupted: {len(missing_frames)} missing frames: {missing_frames[:10]}")
            
        fps = request.fps or 30.0
        return {
            "output_directory": str(output_dir.resolve()),
            "first_frame": str((output_dir / "frame_000000.png").resolve()),
            "pattern": str((output_dir / "frame_%06d.png").resolve()),
            "total_frames": total_frames,
            "duration_seconds": total_frames / fps,
            "fps": fps
        }

    @staticmethod
    def render_burned_mp4(
        request: ExportRequest,
        output_path: Path,
        progress_callback = None
    ) -> Path:
        """
        Renders H.264 MP4 video with burned-in captions (Milestone 5).
        If burn_in_background is provided, overlays on the source video.
        Otherwise renders over a clean dark video background.
        """
        fps = request.fps or 30.0
        width = request.resolution.get("width", 1920)
        height = request.resolution.get("height", 1080)
        temp_dir = Path(tempfile.mkdtemp(prefix="captionlab_render_mp4_"))
        try:
            total_frames = ExportService._render_frames(request, temp_dir, progress_callback)
            output_path.parent.mkdir(parents=True, exist_ok=True)
            input_pattern = str(temp_dir / "frame_%06d.png")
            
            target_path = output_path
            counter = 1
            while target_path.exists():
                try:
                    with open(target_path, "ab"):
                        break
                except PermissionError:
                    suffix = output_path.suffix
                    stem = output_path.stem
                    target_path = output_path.with_name(f"{stem}_updated_{counter}{suffix}")
                    counter += 1

            if request.burn_in_background and Path(request.burn_in_background).exists():
                ffmpeg_cmd = [
                    "ffmpeg",
                    "-y",
                    "-i", str(request.burn_in_background),
                    "-framerate", str(fps),
                    "-i", input_pattern,
                    "-filter_complex", "[0:v][1:v]overlay=0:0:shortest=1",
                    "-c:v", "libx264",
                    "-pix_fmt", "yuv420p",
                    "-c:a", "copy",
                    str(target_path)
                ]
            else:
                duration_sec = total_frames / fps
                ffmpeg_cmd = [
                    "ffmpeg",
                    "-y",
                    "-f", "lavfi",
                    "-i", f"color=c=0x09090b:s={width}x{height}:r={fps}:d={duration_sec}",
                    "-framerate", str(fps),
                    "-i", input_pattern,
                    "-filter_complex", "[0:v][1:v]overlay=0:0:shortest=1",
                    "-c:v", "libx264",
                    "-pix_fmt", "yuv420p",
                    str(target_path)
                ]

            res = subprocess.run(ffmpeg_cmd, capture_output=True, text=True)
            if res.returncode != 0:
                raise RuntimeError(f"FFmpeg MP4 burn-in encoding failed: {res.stderr}")

            return target_path
        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)
