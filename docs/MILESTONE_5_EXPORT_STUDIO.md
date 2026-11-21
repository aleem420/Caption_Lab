# CAPTIONLAB — MILESTONE 5 EXPORT STUDIO SPECIFICATION

**Product:** CaptionLab — Words into Motion  
**Document:** Export Studio Architecture, Format Matrix & Premiere Pro Integration  
**Milestone:** 5 — Complete Professional Studio  
**Engine Implementation:** `engine/app/services/export_service.py` & `engine/app/api/routes/render.py`  
**Status:** IMPLEMENTED & PASSING (Validated across ProRes 4444, PNG Sequence, MP4, SRT, and WebVTT)

---

## 1. Executive Summary

The Milestone 5 Export Studio provides a comprehensive, multi-format delivery pipeline for motion captions. Designed to satisfy both modern non-linear editors (NLEs) and direct social media publishing, the pipeline supports transparent broadcast-grade master overlays, lightweight social video formats, and standardized timed text files, all generated completely offline via local FFmpeg and Python/Pillow.

---

## 2. Supported Export Formats & Technical Specifications

| Format Card | Codec / Container | Compression & Alpha Characteristics | Color Space / Depth | Primary Target / Host |
| :--- | :--- | :--- | :--- | :--- |
| **ProRes 4444** | `prores_ks` (`ap4h`) / QuickTime `.mov` | **Visually lossless video compression with lossless alpha** | `yuva444p10le` / `yuva444p12le` | Premiere Pro, After Effects, DaVinci Resolve, Final Cut Pro |
| **PNG Sequence** | PNG / Directory of `%06d.png` | **Mathematically lossless image compression** | `rgba` (32-bit total depth: 8-bit/channel) | VFX compositing, Blender, NLE image sequence tracks |
| **Burned-in MP4** | H.264 (`libx264`) / MPEG-4 `.mp4` | **No (Opaque composite)** | `yuv420p`, High Profile | Direct social publishing, client preview, Instagram, YouTube |
| **SubRip (.srt)** | Timed Text / `.srt` | N/A | UTF-8 Plain Text | Web players, YouTube closed captions, Vimeo |
| **WebVTT (.vtt)** | Timed Text / `.vtt` | N/A | UTF-8 Plain Text | HTML5 `<video>`, web applications, browsers |

---

## 3. Burned-in MP4 Engine Architecture

Milestone 5 adds the new **Burned-in MP4** capability to `export_service.py`:
- **Dual Pass Compositing:** The motion graphics animation engine renders caption frames onto a transparent RGBA canvas at native project framerate and resolution.
- **FFmpeg Filtergraph Blending:** The rendered RGBA stream is overlaid directly onto the source video via FFmpeg's `overlay` filtergraph:
  ```bash
  ffmpeg -y -i source_video.mp4 -framerate 25 -i frames/%06d.png -filter_complex "[0:v][1:v]overlay=0:0[outv]" -map "[outv]" -map 0:a? -c:v libx264 -pix_fmt yuv420p -crf 18 -preset fast -c:a aac -b:a 192k output.mp4
  ```
- **Audio Integrity:** Original audio streams from the source media are preserved and multiplexed into the final container.

---

## 4. Multi-Aspect Ratio & Safe Area Geometry

The export engine supports all standard broadcast and social aspect ratios, computing dynamic safe areas based on EBU R95 and social media UI overlays:

| Aspect Ratio | Resolution | Safe Area Margins | Recommended Layouts | Target Platforms |
| :--- | :--- | :--- | :--- | :--- |
| **16:9** | $1920 \times 1080$ | 10% EBU Title Safe (192px H, 108px V) | `bottom_center`, `lower_third_left` | YouTube, TV, Presentations |
| **9:16** | $1080 \times 1920$ | 15% Top / 20% Bottom (Social UI clearance) | `middle_center`, `bottom_center` | TikTok, Reels, Shorts |
| **1:1** | $1080 \times 1080$ | 8% Uniform (86px) | `middle_center`, `bottom_center` | Instagram Feed, LinkedIn |
| **4:5** | $1080 \times 1350$ | 10% Uniform (108px H, 135px V) | `middle_center`, `bottom_center` | Instagram Portrait Posts |
| **21:9** | $2560 \times 1080$ | 10% Title Safe | `bottom_center` | Cinematic Ultrawide |
| **Custom** | Any $W \times H$ | Configurable percentage | Custom Layout Family | Bespoke digital signage |

---

## 5. Dual-Host Premiere Pro Integration

CaptionLab accommodates both modern and legacy Premiere Pro environments through a unified export strategy:

```
                          ┌───────────────────────────┐
                          │   CaptionLab Core Engine  │
                          └─────────────┬─────────────┘
                                        │
                 ┌──────────────────────┴──────────────────────┐
                 ▼                                             ▼
  ┌───────────────────────────────┐             ┌───────────────────────────────┐
  │  Premiere Pro 2025+ (UXP)     │             │  Premiere Pro 2023 (Legacy)   │
  │  Direct In-App Track Insertion│             │  Standalone Companion Export  │
  ├───────────────────────────────┤             ├───────────────────────────────┤
  │ - Direct UXP host bridge      │             │ - Standalone Export Bundle    │
  │ - Automated track overlay     │             │ - Structured asset directory  │
  │ - Instant sequence sync       │             │ - `package_manifest.json`     │
  │ - Non-destructive replacement │             │ - Single-folder drag & drop   │
  └───────────────────────────────┘             └───────────────────────────────┘
```

### Standalone Export Package Structure
For Premiere Pro 2023 environments (such as tested on Premiere Pro 23.5.0.56), the export creates a self-contained bundle:
```
export_package/
├── captions_prores4444.mov     # Transparent master overlay
├── subtitles.srt               # UTF-8 timed text with commas
├── subtitles.vtt               # WebVTT timed text with dots
├── sequence_frames/            # Full 32-bit RGBA PNG sequence
│   ├── frame_000000.png
│   └── ...
└── package_manifest.json       # Metadata, sequence FPS, resolution, safe zones
```

---

## 6. Verification & Test Evidence

Validated across unit tests, visual QA, and end-to-end integration:

| Test Case | Scope | Verified Feature | Status |
| :--- | :--- | :--- | :--- |
| `test_05_burned_in_mp4_export` | `test_milestone5_design_and_presets.py` | Burned-in H.264 MP4 export with audio | **PASS** |
| `test_05_png_sequence_and_missing_frame_detection` | `test_visual_qa.py` | 32-bit RGBA PNG sequence integrity | **PASS** |
| `test_15_prores_alpha_channel_preservation` | `test_visual_qa.py` | Lossless alpha channel in ProRes 4444 | **PASS** |
| `test_03_aspect_ratios_and_resolutions` | `test_visual_qa.py` | 16:9, 9:16, 1:1, 4:5 resolutions | **PASS** |
| `test_04_user_customization_strict_preservation` | `test_visual_qa.py` | Custom styles preserved against presets | **PASS** |
| `test_TC_P4_01` & `test_TC_P4_02` | `test_milestone3_e2e.py` | SRT and WebVTT standard compliance | **PASS** |
| `test_TC_P4_03` & `test_TC_P4_04` | `test_milestone3_e2e.py` | Full 10s ProRes 4444 & PNG sequence | **PASS** |
| `test_TC_P5_01` & `test_TC_P5_02` | `test_milestone3_e2e.py` | Real Premiere Pro 2023 asset bundle | **PASS** |

---

## 7. Conclusion

The Milestone 5 Export Studio completes the delivery chain for CaptionLab, offering production-grade ProRes 4444, burned-in MP4, PNG sequences, and subtitle files with complete offline reliability.
