import json
from typing import List, Dict, Any, Optional
from app.services.db import db_service
from app.models.schemas import PresetModel

# 10 Professional Style Presets (PRD Section 13.2)
BUILTIN_STYLE_PRESETS: List[Dict[str, Any]] = [
    {
        "id": "classic_hindi",
        "name": "Classic Hindi",
        "layout_family": "balanced_two_line",
        "typography": {
            "font_family": "Noto Sans Devanagari",
            "font_weight": "700",
            "font_size": 46.0,
            "line_height": 1.25,
            "letter_spacing": 0.0,
            "alignment": "center",
            "color": "#FFFFFF",
            "stroke_color": "#000000",
            "stroke_width": 3.0,
            "shadow_color": "rgba(0,0,0,0.8)",
            "shadow_blur": 6.0
        },
        "background": {"enabled": False, "color": "#000000", "opacity": 0.7, "border_radius": 8.0, "padding_x": 16.0, "padding_y": 8.0},
        "animation": {
            "entrance": {"type": "fade_in", "duration_frames": 5},
            "emphasis": {"type": "none", "duration_frames": 0},
            "exit": {"type": "fade_out", "duration_frames": 4},
            "word_animation": {"type": "karaoke_highlight", "active_color": "#FFDF00", "active_scale": 1.1}
        },
        "version": "1.3.0"
    },
    {
        "id": "bold_social_media",
        "name": "Bold Social Media (Reels / Shorts)",
        "layout_family": "keyword_highlight",
        "typography": {
            "font_family": "Mukta",
            "font_weight": "800",
            "font_size": 54.0,
            "line_height": 1.15,
            "letter_spacing": 1.0,
            "alignment": "center",
            "color": "#FFFFFF",
            "stroke_color": "#000000",
            "stroke_width": 5.0,
            "shadow_color": "rgba(0,0,0,0.9)",
            "shadow_blur": 10.0
        },
        "background": {"enabled": False, "color": "#000000", "opacity": 0.8, "border_radius": 12.0, "padding_x": 20.0, "padding_y": 10.0},
        "animation": {
            "entrance": {"type": "pop_in", "duration_frames": 6},
            "emphasis": {"type": "pulse", "duration_frames": 10, "repeat": True},
            "exit": {"type": "shrink", "duration_frames": 4},
            "word_animation": {"type": "word_pop", "active_color": "#00FF66", "active_scale": 1.25}
        },
        "version": "1.3.0"
    },
    {
        "id": "modern_minimal",
        "name": "Modern Minimal",
        "layout_family": "single_line",
        "typography": {
            "font_family": "Hind",
            "font_weight": "600",
            "font_size": 40.0,
            "line_height": 1.2,
            "letter_spacing": 0.5,
            "alignment": "center",
            "color": "#F4F4F5",
            "stroke_color": "#18181B",
            "stroke_width": 2.0
        },
        "background": {"enabled": False, "color": "#000000", "opacity": 0.5, "border_radius": 6.0, "padding_x": 12.0, "padding_y": 6.0},
        "animation": {
            "entrance": {"type": "fade_in", "duration_frames": 4},
            "emphasis": {"type": "none", "duration_frames": 0},
            "exit": {"type": "fade_out", "duration_frames": 4},
            "word_animation": {"type": "karaoke_highlight", "active_color": "#E4E4E7", "active_scale": 1.05}
        },
        "version": "1.3.0"
    },
    {
        "id": "neon_gaming",
        "name": "Neon Gaming",
        "layout_family": "stacked",
        "typography": {
            "font_family": "Noto Sans Devanagari",
            "font_weight": "900",
            "font_size": 52.0,
            "line_height": 1.1,
            "alignment": "center",
            "color": "#00FFFF",
            "stroke_color": "#000000",
            "stroke_width": 6.0,
            "shadow_color": "#FF00FF",
            "shadow_blur": 15.0
        },
        "background": {"enabled": True, "color": "#0A0A0F", "opacity": 0.85, "border_radius": 10.0, "padding_x": 22.0, "padding_y": 10.0},
        "animation": {
            "entrance": {"type": "bounce_in", "duration_frames": 6},
            "emphasis": {"type": "glow", "duration_frames": 8},
            "exit": {"type": "shrink", "duration_frames": 4},
            "word_animation": {"type": "word_pop", "active_color": "#FFFF00", "active_scale": 1.2}
        },
        "version": "1.3.0"
    },
    {
        "id": "podcast_interview",
        "name": "Podcast Interview (Speaker-Based)",
        "layout_family": "speaker_based",
        "typography": {
            "font_family": "Noto Sans Devanagari",
            "font_weight": "600",
            "font_size": 42.0,
            "line_height": 1.3,
            "alignment": "left",
            "color": "#FAFAFA",
            "stroke_color": "#09090B",
            "stroke_width": 3.0
        },
        "background": {"enabled": True, "color": "#18181B", "opacity": 0.9, "border_radius": 8.0, "padding_x": 20.0, "padding_y": 12.0},
        "animation": {
            "entrance": {"type": "slide_in", "duration_frames": 5},
            "emphasis": {"type": "none", "duration_frames": 0},
            "exit": {"type": "fade_out", "duration_frames": 4},
            "word_animation": {"type": "karaoke_highlight", "active_color": "#38BDF8", "active_scale": 1.08}
        },
        "version": "1.3.0"
    },
    {
        "id": "corporate_clean",
        "name": "Corporate Clean",
        "layout_family": "balanced_two_line",
        "typography": {
            "font_family": "Nirmala UI",
            "font_weight": "700",
            "font_size": 44.0,
            "line_height": 1.2,
            "alignment": "center",
            "color": "#FFFFFF",
            "stroke_color": "#1E293B",
            "stroke_width": 2.0
        },
        "background": {"enabled": False, "color": "#000000", "opacity": 0.6, "border_radius": 6.0, "padding_x": 16.0, "padding_y": 8.0},
        "animation": {
            "entrance": {"type": "fade_in", "duration_frames": 5},
            "emphasis": {"type": "none", "duration_frames": 0},
            "exit": {"type": "fade_out", "duration_frames": 4},
            "word_animation": {"type": "karaoke_highlight", "active_color": "#60A5FA", "active_scale": 1.1}
        },
        "version": "1.3.0"
    },
    {
        "id": "cinematic_gold",
        "name": "Cinematic Gold",
        "layout_family": "cinematic",
        "typography": {
            "font_family": "Noto Serif Devanagari",
            "font_weight": "600",
            "font_size": 44.0,
            "line_height": 1.3,
            "letter_spacing": 2.0,
            "alignment": "center",
            "color": "#FEF08A",
            "stroke_color": "#451A03",
            "stroke_width": 2.5
        },
        "background": {"enabled": False, "color": "#000000", "opacity": 0.4, "border_radius": 4.0, "padding_x": 16.0, "padding_y": 6.0},
        "animation": {
            "entrance": {"type": "fade_in", "duration_frames": 8},
            "emphasis": {"type": "none", "duration_frames": 0},
            "exit": {"type": "fade_out", "duration_frames": 6},
            "word_animation": {"type": "karaoke_highlight", "active_color": "#FBBF24", "active_scale": 1.05}
        },
        "version": "1.3.0"
    },
    {
        "id": "boxed_broadcast",
        "name": "Boxed Broadcast News",
        "layout_family": "boxed",
        "typography": {
            "font_family": "Noto Sans Devanagari",
            "font_weight": "800",
            "font_size": 46.0,
            "line_height": 1.2,
            "alignment": "center",
            "color": "#FFFFFF",
            "stroke_color": "#000000",
            "stroke_width": 3.0
        },
        "background": {"enabled": True, "color": "#DC2626", "opacity": 0.95, "border_radius": 4.0, "padding_x": 24.0, "padding_y": 10.0},
        "animation": {
            "entrance": {"type": "pop_in", "duration_frames": 4},
            "emphasis": {"type": "none", "duration_frames": 0},
            "exit": {"type": "fade_out", "duration_frames": 3},
            "word_animation": {"type": "karaoke_highlight", "active_color": "#FEF08A", "active_scale": 1.12}
        },
        "version": "1.3.0"
    },
    {
        "id": "word_pop_viral",
        "name": "Viral Word-by-Word",
        "layout_family": "word_by_word",
        "typography": {
            "font_family": "Mukta",
            "font_weight": "900",
            "font_size": 60.0,
            "line_height": 1.1,
            "alignment": "center",
            "color": "#FFFFFF",
            "stroke_color": "#000000",
            "stroke_width": 6.0
        },
        "background": {"enabled": False, "color": "#000000", "opacity": 0.7, "border_radius": 10.0, "padding_x": 16.0, "padding_y": 8.0},
        "animation": {
            "entrance": {"type": "pop_in", "duration_frames": 4},
            "emphasis": {"type": "none", "duration_frames": 0},
            "exit": {"type": "shrink", "duration_frames": 3},
            "word_animation": {"type": "word_pop", "active_color": "#FACC15", "active_scale": 1.3}
        },
        "version": "1.3.0"
    },
    {
        "id": "educational",
        "name": "Educational / Explainer",
        "layout_family": "balanced_two_line",
        "typography": {
            "font_family": "Noto Sans Devanagari",
            "font_weight": "700",
            "font_size": 44.0,
            "line_height": 1.25,
            "alignment": "center",
            "color": "#FFFFFF",
            "stroke_color": "#0F172A",
            "stroke_width": 3.0
        },
        "background": {"enabled": True, "color": "#1E293B", "opacity": 0.85, "border_radius": 8.0, "padding_x": 18.0, "padding_y": 8.0},
        "animation": {
            "entrance": {"type": "fade_in", "duration_frames": 5},
            "emphasis": {"type": "none", "duration_frames": 0},
            "exit": {"type": "fade_out", "duration_frames": 4},
            "word_animation": {"type": "karaoke_highlight", "active_color": "#34D399", "active_scale": 1.12}
        },
        "version": "1.3.0"
    }
]

# 10 Professional Motion Presets (Milestone 5 Phase 2)
BUILTIN_MOTION_PRESETS: List[Dict[str, Any]] = [
    {
        "id": "mot_word_pop",
        "name": "Word Pop",
        "type": "word_pop",
        "animation_target": "word",
        "easing": "cubic",
        "duration_frames": 6,
        "config": {"active_scale": 1.25, "active_color": "#FFDF00"}
    },
    {
        "id": "mot_smooth_fade",
        "name": "Smooth Fade",
        "type": "smooth_fade",
        "animation_target": "caption",
        "easing": "linear",
        "duration_frames": 6,
        "config": {"start_opacity": 0.0, "end_opacity": 1.0}
    },
    {
        "id": "mot_slide_up",
        "name": "Slide Up",
        "type": "slide_up",
        "animation_target": "caption",
        "easing": "ease_out",
        "duration_frames": 6,
        "config": {"offset_y": 25.0}
    },
    {
        "id": "mot_slide_down",
        "name": "Slide Down",
        "type": "slide_down",
        "animation_target": "caption",
        "easing": "ease_out",
        "duration_frames": 6,
        "config": {"offset_y": -25.0}
    },
    {
        "id": "mot_type_reveal",
        "name": "Type Reveal",
        "type": "type_reveal",
        "animation_target": "word",
        "easing": "linear",
        "duration_frames": 4,
        "config": {"stagger_frames": 3}
    },
    {
        "id": "mot_karaoke",
        "name": "Karaoke Highlight",
        "type": "karaoke_highlight",
        "animation_target": "word",
        "easing": "cubic",
        "duration_frames": 5,
        "config": {"active_color": "#FFDF00", "active_scale": 1.15}
    },
    {
        "id": "mot_scale_bounce",
        "name": "Scale Bounce",
        "type": "scale_bounce",
        "animation_target": "word",
        "easing": "bounce",
        "duration_frames": 8,
        "config": {"active_scale": 1.30, "bounce_height": 6.0}
    },
    {
        "id": "mot_cinematic",
        "name": "Cinematic Reveal",
        "type": "cinematic_reveal",
        "animation_target": "caption",
        "easing": "ease_in_out",
        "duration_frames": 10,
        "config": {"start_scale": 0.95, "end_scale": 1.0}
    },
    {
        "id": "mot_staggered",
        "name": "Staggered Words",
        "type": "staggered_words",
        "animation_target": "word",
        "easing": "ease_out",
        "duration_frames": 6,
        "config": {"stagger_frames": 2}
    },
    {
        "id": "mot_char_reveal",
        "name": "Character Reveal",
        "type": "character_reveal",
        "animation_target": "character",
        "easing": "linear",
        "duration_frames": 3,
        "config": {}
    }
]

class PresetService:
    """
    Service managing builtin and user-defined style and motion presets.
    """

    def __init__(self):
        self._ensure_builtins()

    def _ensure_builtins(self):
        """Seed SQLite database with builtin presets if not present."""
        for p in BUILTIN_STYLE_PRESETS:
            db_service._sync_save_preset(
                preset_id=p["id"],
                name=p["name"],
                category="style",
                version="1.3.0",
                data=p
            )
        for m in BUILTIN_MOTION_PRESETS:
            db_service._sync_save_preset(
                preset_id=m["id"],
                name=m["name"],
                category="motion",
                version="1.3.0",
                data=m
            )

    async def list_presets(self, category: Optional[str] = None) -> List[Dict[str, Any]]:
        return await db_service.list_presets(category)

    async def get_preset(self, preset_id: str) -> Optional[Dict[str, Any]]:
        return await db_service.get_preset(preset_id)

    async def save_preset(self, preset: PresetModel) -> Dict[str, Any]:
        await db_service.save_preset(
            preset_id=preset.id,
            name=preset.name,
            category=preset.category,
            version=preset.version,
            data=preset.preset_data
        )
        return {"status": "saved", "preset_id": preset.id}

    async def delete_preset(self, preset_id: str) -> bool:
        return await db_service.delete_preset(preset_id)

    async def export_preset_json(self, preset_id: str) -> Optional[str]:
        preset = await db_service.get_preset(preset_id)
        if not preset:
            return None
        return json.dumps(preset, indent=2)

    async def import_preset_json(self, json_str: str) -> Dict[str, Any]:
        try:
            data = json.loads(json_str)
            p_id = data.get("id") or data.get("preset_id")
            name = data.get("name", "Imported Preset")
            category = data.get("category", "style")
            version = data.get("version", "1.3.0")
            preset_data = data.get("preset_data") or data

            if not p_id:
                import uuid
                p_id = f"custom_{uuid.uuid4().hex[:8]}"

            await db_service.save_preset(p_id, name, category, version, preset_data)
            return {"status": "imported", "preset_id": p_id, "name": name}
        except Exception as e:
            raise ValueError(f"Invalid preset JSON: {str(e)}")

preset_service = PresetService()
