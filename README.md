# CaptionLab — AI Caption & Motion Graphics Studio

> **Words into Motion.**  
> Adobe Premiere Pro 2025+ UXP Plugin for Local-First, Offline-Capable Hindi & Hinglish Transcription, Dynamic Layouts, and Motion Graphics.

---

## Overview

**CaptionLab** is a professional caption generation and motion typography studio built as an Adobe Premiere Pro UXP plugin. It features:
- **Local AI Transcription:** Accurate Hindi and Hinglish speech recognition with word-level timestamps using `faster-whisper` and `Silero VAD`.
- **Dynamic Layout Engine:** 8 intelligent layout families that automatically balance and position captions across 16:9, 9:16, 1:1, and custom resolutions.
- **Hindi Typography Engine:** Grapheme-aware segmentation preserving Devanagari matras, conjuncts, and ligatures.
- **Advanced 3-Level Editor:** Granular control at Caption level, Text Block level, and Word level with property provenance protection (`DEFAULT`, `AUTO`, `USER`, `IMPORTED`).
- **Word-by-Word Motion Graphics:** Word pop, karaoke highlights, sequential reveals, and custom animations.
- **Dual Export Pipeline:** Editable native subtitles (SRT, WebVTT) and transparent Apple ProRes 4444 MOV with alpha channel / PNG sequence.
- **100% Free & Open-Source Core:** Zero cloud subscriptions, zero paid APIs, zero usage-based billing.

---

## Repository Structure

```
Caption_Lab/
├── docs/                 # Product Requirements (PRD v1.2) & Architecture Specs
├── shared/               # Universal schemas, models, and TypeScript types
├── engine/               # Local Python Processing Engine (FastAPI, Faster-Whisper, FFmpeg)
└── plugin/               # Adobe Premiere Pro UXP Frontend (React, TypeScript, Vite, Zustand)
```

---

## Quick Start

### 1. Prerequisites
- **Node.js:** v18+ (Node 24 recommended)
- **Python:** 3.11 or 3.12
- **FFmpeg:** Installed and available in PATH (with ProRes and FreeType support)
- **Adobe Premiere Pro:** 2025+ (v25.0 or newer)
- **UXP Developer Tool (UDT):** For loading the plugin during development

### 2. Local Python Engine
```bash
cd engine
python -m venv .venv
.venv\Scripts\activate       # Windows
pip install -r requirements.txt
python run.py
```

### 3. Premiere UXP Plugin
```bash
cd plugin
npm install
npm run build
```
Load the `plugin/` directory in Adobe UXP Developer Tool and attach to Premiere Pro 2025+.

---

## License & Philosophy
CaptionLab core is built strictly on open-source, permissively licensed libraries (MIT, Apache 2.0, LGPL). It requires no mandatory accounts, telemetry, or external network requests during transcription and rendering.
