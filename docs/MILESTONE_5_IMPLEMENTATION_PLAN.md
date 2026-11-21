# CaptionLab — Milestone 5 Detailed Implementation Plan

**Product:** CaptionLab — Words into Motion  
**Target Platform:** Windows 10/11 x64  
**Primary Host:** Adobe Premiere Pro 2025+ (UXP)  
**Legacy Host:** Adobe Premiere Pro 2023 (Standalone Companion)  
**Architecture:** Local-first, offline-capable  
**Milestone:** 5 — Complete Professional Studio  
**Date:** November 21, 2026  

---

## 1. Overview and Implementation Principles

This plan operationalizes the complete engineering requirements for **Milestone 5 (Complete Professional Studio)**.
The development is partitioned into seven distinct, sequential execution sub-milestones:

- **M5.1 — Advanced Design Studio:** Full typography suite, dynamic line wrapping, multi-line bounds, safe area collision detection, and 10 professional presets.
- **M5.2 — Advanced Motion Graphics Engine:** Dedicated parametric easing engine (Linear, Ease-In, Ease-Out, Ease-In-Out, Cubic, Bounce), multi-level animation targets (Caption, Line, Word, Character), and 10 motion presets.
- **M5.3 — AI Caption Intelligence:** Local Faster-Whisper transcript refinement, punctuation/boundary hints, filler word and repetition detection, intelligent grouping with natural pause detection, and caption quality scoring.
- **M5.4 — Professional Preview and Timeline Studio:** Timeline block scrubbing, frame stepping, reference video background canvas preview, and preview-render parity.
- **M5.5 — Export Studio:** ProRes 4444 MOV with alpha, PNG sequence, SRT, WebVTT, H.264 MP4 burning, progress cancellation, and file-lock recovery.
- **M5.6 — Preset, Template & Asset Management:** SQLite custom presets storage, JSON import/export, and local font catalog scanner.
- **M5.7 — Premiere Host Verification:** UXP Manifest v5 verification and Premiere Pro 2023 import bundle verification.
- **M5.8 — Performance, Reliability, QA & Final Acceptance:** Comprehensive stress benchmarks, new test suites, documentation, and final signoff.

---

## 2. Sub-Milestone Execution Details

### Sub-Milestone M5.1 — Advanced Design Studio
**Scope:**
1. Extend `TypographyModel` and `TypographyStyle` to support:
   - `letter_spacing`, `line_height`, `word_spacing`, `text_align` (`left`, `center`, `right`).
   - `fill_type` (`solid`, `linear_gradient`), `gradient_colors`, `gradient_angle`.
   - `stroke_color`, `stroke_width`, `shadow_color`, `shadow_blur`, `shadow_offset_x`, `shadow_offset_y`.
2. Implement robust multi-line wrapping in `CaptionLayoutEngine`:
   - Natural wrapping based on max width constraints within title-safe areas.
   - Devanagari grapheme preservation during line breaks (never split within a word or matra).
3. Enhance `CaptionStudioTab.tsx` with:
   - Expanded Typography inspector controls (letter spacing, line height, word spacing, text alignment, gradient picker).
   - Safe-area visual overlays for 16:9, 9:16, 1:1, 4:5.
   - Per-word override support in UI.

### Sub-Milestone M5.2 — Advanced Motion Graphics Engine
**Scope:**
1. Create `engine/app/services/animation_engine.py`:
   - Easing functions: `linear`, `ease_in_quad`, `ease_out_quad`, `ease_in_out_quad`, `cubic_ease_out`, `bounce_out`.
   - Property interpolation: `position` (X, Y), `scale` (X, Y), `rotation` (degrees), `opacity` (0.0–1.0), `blur` (px), `tracking`.
   - Animation targets: `caption`, `line`, `word`, `character`.
   - Motion Presets: `word_pop`, `smooth_fade`, `slide_up`, `slide_down`, `type_reveal`, `karaoke_highlight`, `scale_bounce`, `cinematic_reveal`, `staggered_words`, `character_reveal`.
2. Connect `AnimationEngine` into `ExportService._render_frames` and `CaptionStudioTab` canvas preview:
   - Identical math for both renderers to guarantee pixel parity.

### Sub-Milestone M5.3 — AI Caption Intelligence
**Scope:**
1. Create `engine/app/services/caption_intelligence.py`:
   - Transcript refinement:
     - Detect filler words in Hindi (`मतलब`, `तो`, `यानी`, `अरे`) and English (`umm`, `uh`, `like`, `you know`).
     - Detect repeated words (stuttering).
     - Flag low-confidence words (`confidence < 0.65`).
   - Intelligent grouping:
     - Acoustic pause detection (`word[i].start - word[i-1].end > 0.45s`).
     - Reading speed analysis (Characters Per Second and Words Per Minute).
     - Optimal sentence splitting and merging heuristics.
   - Quality scoring:
     - CPS warning (`> 25 cps` too fast, `< 5 cps` too slow).
     - Line length warning (`> 37 chars` for single line).
     - Safe area collision alert.
2. Add API route in `engine/app/api/routes/transcribe.py` for `/transcribe/analyze-quality` and `/transcribe/refine`.
3. Display quality metrics and alerts in `TranscriptEditorTab.tsx` and `CaptionStudioTab.tsx`.

### Sub-Milestone M5.4 — Professional Preview and Timeline Studio
**Scope:**
1. Enhance `CaptionStudioTab.tsx` with:
   - Background video preview support (load local video file or placeholder).
   - Interactive timeline scrubber with caption blocks and word markers.
   - Transport controls: Play/Pause, Step 1 frame forward, Step 1 frame backward, Jump to active caption.
2. Ensure timeline navigation updates `currentTime` and active selection across tabs.

### Sub-Milestone M5.5 — Export Studio
**Scope:**
1. Extend `ExportService`:
   - Support `mp4` export with burned-in captions via FFmpeg overlay if requested.
   - Export cancellation flag support.
   - Versioned output file naming when destination is locked by NLE.
2. Extend `ExportTab.tsx` and `StandaloneExportTab.tsx` with:
   - MP4 format option alongside ProRes 4444, PNG sequence, and SRT/VTT.
   - Detailed export progress bar and cancellation button.

### Sub-Milestone M5.6 — Preset, Template & Asset Management
**Scope:**
1. Create `engine/app/services/preset_service.py`:
   - SQLite CRUD for `custom_presets`.
   - Export preset as JSON, import preset from JSON.
2. Create `engine/app/services/font_service.py`:
   - Detect available system fonts supporting Devanagari (Windows font registry scanning).
3. Create `engine/app/api/routes/presets.py` and register in `main.py`.
4. Connect preset store in frontend to create, edit, duplicate, and delete custom presets.

### Sub-Milestone M5.7 — Premiere Host Verification
**Scope:**
1. Validate UXP Manifest v5 compilation for Premiere Pro 2025+.
2. Validate Standalone Companion bundle for Premiere Pro 2023 (`23.5.0.56`).

### Sub-Milestone M5.8 — Performance, QA & Final Acceptance
**Scope:**
1. Add new automated test suites for:
   - `test_milestone5_motion_engine.py`
   - `test_milestone5_ai_intelligence.py`
   - `test_milestone5_design_and_presets.py`
2. Run all existing 57 tests to guarantee zero regressions.
3. Generate complete documentation reports and deliver final acceptance.
