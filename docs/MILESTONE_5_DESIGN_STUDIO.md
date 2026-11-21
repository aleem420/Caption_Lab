# CaptionLab — Milestone 5: Advanced Design Studio Report

**Product:** CaptionLab — Words into Motion  
**Sub-Milestone:** M5.1 / M5.6 — Advanced Design Studio & Asset Management  
**Status:** **COMPLETE & VERIFIED**  
**Date:** November 21, 2026  

---

## 1. Overview

The Advanced Design Studio equips CaptionLab with a comprehensive typography, layout, and preset design system engineered specifically for professional Hindi and Hinglish video workflows.

---

## 2. Implemented Capabilities

### 2.1 Hindi Typography & Font Discovery
- **Local Font Scanner (`engine/app/services/font_service.py`):**
  - Scans system fonts (`C:/Windows/Fonts`, local app data) and registers Devanagari-compatible fonts:
    - `Noto Sans Devanagari` (Default clean sans-serif)
    - `Mangal` (Windows system Devanagari standard)
    - `Nirmala UI` (Modern balanced UI font)
    - `Mukta` (High-energy display font for Reels and Shorts)
    - `Hind` (Balanced body font for podcasts)
    - `Noto Serif Devanagari` (Cinematic subtitles)
  - Automatic fallback hierarchy: Requested Font → Mangal → Nirmala UI → Arial → FreeType Default.
- **Typography Controls:**
  - Font Size (`24px` to `80px`)
  - Font Weight (`400`, `600`, `700`, `900`)
  - Letter Spacing (`-2px` to `+8px` with glyph boundary locking)
  - Line Height (`1.0` to `1.8`)
  - Text Alignment (`left`, `center`, `right`)
  - Fill Color (HEX/RGB)
  - Text Stroke (`stroke_color` & `stroke_width`)
  - Drop Shadow (`shadow_color`, `shadow_blur`, offsets)

### 2.2 Layout Engine & Safe Area Constraints
- **8 Intelligent Layout Families:**
  - `single_line`: 1-line centered or lower-third layout.
  - `balanced_two_line`: Natural two-line balance avoiding orphan words.
  - `stacked`: High-impact multi-block titles.
  - `keyword_highlight`: Hero keyword emphasis.
  - `word_by_word`: Dynamic 1-2 word rapid pacing for Reels/Shorts.
  - `speaker_based`: Left-aligned speaker dialogue.
  - `boxed`: Rounded background box with high contrast.
  - `cinematic`: Wide letter-spaced lower third.
- **Multi-Line Dynamic Wrapping (`CaptionLayoutEngine.wrap_words_into_lines`):**
  - Wraps words based on character and pixel width limits without ever splitting individual Hindi words, halants, matras, or conjuncts.
- **Title Safe Areas:**
  - `16:9`, `1:1`, `4:5`: Clamped within `[0.10, 0.90]`.
  - `9:16` (Vertical): Clamped within `[0.15, 0.80]` to prevent occlusion by TikTok / Instagram Reels UI elements.

### 2.3 Style & Motion Presets
- **10 Built-In Style Presets:**
  `Classic Hindi`, `Bold Social Media`, `Modern Minimal`, `Neon Gaming`, `Podcast Interview`, `Corporate Clean`, `Cinematic Gold`, `Boxed Broadcast`, `Viral Word-by-Word`, `Educational Explainer`.
- **Custom Presets Storage:**
  - Stored in SQLite table `custom_presets`.
  - Full CRUD supported via REST API (`/presets/all`, `/presets/save`, `/presets/{id}`, `/presets/export/{id}`, `/presets/import`).
  - One-click "Save Custom Preset" from the UI inspector.
