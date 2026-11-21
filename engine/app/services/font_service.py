import os
from pathlib import Path
from typing import List, Dict, Any, Optional
from PIL import ImageFont
from app.services.db import db_service

class FontService:
    """
    Local font management and typography resolution service.
    Detects and validates local system fonts with specialized Devanagari script support.
    """
    
    DEVANAGARI_CANDIDATES = [
        ("Noto Sans Devanagari", ["NotoSansDevanagari-Bold.ttf", "NotoSansDevanagari-Regular.ttf", "NotoSans-Bold.ttf"]),
        ("Mangal", ["mangal.ttf", "mangalb.ttf"]),
        ("Nirmala UI", ["Nirmala.ttf", "NirmalaB.ttf", "NirmalaS.ttf"]),
        ("Mukta", ["Mukta-Bold.ttf", "Mukta-Regular.ttf"]),
        ("Hind", ["Hind-Bold.ttf", "Hind-Regular.ttf"]),
        ("Aparajita", ["aparaj.ttf", "aparajb.ttf"]),
        ("Utsaah", ["utsaah.ttf", "utsaahb.ttf"]),
        ("Arial Unicode MS", ["ARIALUNI.TTF", "arial.ttf"])
    ]
    
    SYSTEM_FONT_DIRS = [
        Path("C:/Windows/Fonts"),
        Path(os.environ.get("LOCALAPPDATA", "")) / "Microsoft" / "Windows" / "Fonts",
        Path("assets/fonts"),
        Path("engine/assets/fonts")
    ]
    
    def __init__(self):
        self._font_cache: Dict[str, ImageFont.FreeTypeFont] = {}
        self._font_map: Dict[str, str] = {}
        self._scan_and_index_fonts()

    def _scan_and_index_fonts(self):
        """Scans system font directories and builds a fast lookup map."""
        # 1. Search Windows fonts directory
        for font_dir in self.SYSTEM_FONT_DIRS:
            if not font_dir.exists():
                continue
            try:
                for entry in font_dir.glob("*.ttf"):
                    name_lower = entry.stem.lower()
                    self._font_map[name_lower] = str(entry)
                    # Also map direct filename
                    self._font_map[entry.name.lower()] = str(entry)
                for entry in font_dir.glob("*.otf"):
                    name_lower = entry.stem.lower()
                    self._font_map[name_lower] = str(entry)
                    self._font_map[entry.name.lower()] = str(entry)
            except Exception:
                pass

        # 2. Map known Devanagari font families
        for family_name, filenames in self.DEVANAGARI_CANDIDATES:
            for fname in filenames:
                fl = fname.lower()
                if fl in self._font_map:
                    self._font_map[family_name.lower()] = self._font_map[fl]
                    break

    def get_available_fonts(self) -> List[Dict[str, Any]]:
        """Returns catalog of verified fonts that can be selected in the UI."""
        results = []
        # Priority Devanagari fonts
        for family_name, filenames in self.DEVANAGARI_CANDIDATES:
            resolved_path = None
            for fname in filenames:
                fl = fname.lower()
                if fl in self._font_map:
                    resolved_path = self._font_map[fl]
                    break
            if resolved_path and os.path.exists(resolved_path):
                results.append({
                    "family": family_name,
                    "file_path": resolved_path,
                    "supports_devanagari": True,
                    "is_system": True
                })

        # Add standard Latin fallbacks
        for lat_family, fname in [("Arial", "arial.ttf"), ("Segoe UI", "segoeui.ttf"), ("Trebuchet MS", "trebuc.ttf")]:
            fl = fname.lower()
            if fl in self._font_map:
                results.append({
                    "family": lat_family,
                    "file_path": self._font_map[fl],
                    "supports_devanagari": False,
                    "is_system": True
                })

        return results

    def resolve_font_path(self, font_family: str) -> Optional[str]:
        """Resolves font family name to an absolute file path on disk."""
        key = font_family.strip().lower()
        if key in self._font_map:
            return self._font_map[key]

        # Check partial match
        for k, p in self._font_map.items():
            if key in k or k in key:
                return p

        # Check default Devanagari fallbacks
        for fallback in ["mangal", "nirmala", "arial"]:
            if fallback in self._font_map:
                return self._font_map[fallback]

        # Windows absolute paths
        for candidate in ["C:/Windows/Fonts/mangal.ttf", "C:/Windows/Fonts/Nirmala.ttf", "C:/Windows/Fonts/arial.ttf"]:
            if os.path.exists(candidate):
                return candidate

        return None

    def load_font(self, font_family: str, size: int) -> ImageFont.FreeTypeFont:
        """Loads and caches a FreeType font instance for high-speed rendering."""
        cache_key = f"{font_family.lower()}_{size}"
        if cache_key in self._font_cache:
            return self._font_cache[cache_key]

        path = self.resolve_font_path(font_family)
        font = None
        if path:
            try:
                font = ImageFont.truetype(path, size=size)
            except Exception:
                font = None

        if font is None:
            # Fallback chain
            fallback_candidates = [
                "C:/Windows/Fonts/mangal.ttf",
                "C:/Windows/Fonts/Nirmala.ttf",
                "C:/Windows/Fonts/arial.ttf",
                "mangal.ttf",
                "Nirmala.ttf",
                "arial.ttf"
            ]
            for cand in fallback_candidates:
                try:
                    font = ImageFont.truetype(cand, size=size)
                    break
                except Exception:
                    continue

        if font is None:
            font = ImageFont.load_default()

        self._font_cache[cache_key] = font
        return font

font_service = FontService()
