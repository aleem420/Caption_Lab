# CaptionLab — Known Limitations & Host Boundaries

**Document Version:** 1.0  
**Phase:** 4 — Host Integration & Production Validation  

---

## 1. Overview

In accordance with Section 2 of the Phase 4 PRD (*"Never invent or assume Premiere Pro UXP API capabilities. Verify all required APIs against official Adobe documentation and actual host behavior"*), this document records known technical boundaries, sandbox limitations, and their production-grade fallbacks.

---

## 2. Known Limitations & Mitigation Matrix

### Limitation 1: Direct Timeline Audio Extraction via UXP
- **Description:** Premiere Pro 2025 UXP JavaScript APIs do not expose an in-memory raw PCM audio extraction stream for the active timeline.
- **Why It Exists:** Adobe's UXP security sandbox isolates host application memory from JavaScript panels and restricts arbitrary C++ memory access.
- **Impact:** CaptionLab cannot extract the sequence audio purely through an invisible background JavaScript call without user export.
- **Production Fallback (Verified):**
  - **Source A (Direct Media):** User points to the imported video/audio file (MP4, MOV, WAV, MP3, etc.). CaptionLab validates and extracts 16kHz mono audio directly using FFmpeg without modifying original media.
  - **Source B (Sequence Mixdown):** User performs a standard sequence audio export (`Ctrl+M` -> Waveform Audio / QuickTime Audio). CaptionLab automatically loads the mixdown. This preserves all multi-track dialogue, audio keyframes, and master EQ/compression applied in Premiere.

---

### Limitation 2: Programmatic Timeline Insertion
- **Description:** Premiere Pro UXP 25.0 does not offer a stable, cross-version programmatic API for automatically creating a Subtitle Track and inserting an `.srt` or `.mov` clip onto a specific track without user confirmation.
- **Why It Exists:** Track manipulation and timeline asset creation APIs are still evolving across Premiere 25.x point updates.
- **Impact:** Claiming "One-click invisible timeline injection" would be fragile, error-prone, and prone to breaking across minor Premiere updates.
- **Production Fallback (Verified):**
  - CaptionLab exports broadcast-ready **Apple ProRes 4444 MOV** (`yuva444p10le` with 100% alpha transparency) and **Native SRT / WebVTT**.
  - CaptionLab provides a dedicated **Timeline Integration Card** with exact step-by-step guidance.
  - Users drag the transparent MOV to track `V2` (or SRT to Subtitle Track), giving editors full non-destructive control over placement, cuts, and transitions in Premiere.

---

### Limitation 3: Windows Symlink Warning in HuggingFace Hub
- **Description:** HuggingFace Hub uses symlinks by default when downloading models. On Windows systems without Developer Mode or Administrator privileges, a non-fatal warning is logged: `UserWarning: huggingface_hub cache-system uses symlinks by default...`.
- **Impact:** None on functionality. Faster-Whisper downloads and reads model snapshots cleanly in direct file mode in `engine/models_cache/`.
- **Mitigation:** CaptionLab sets `download_root = str(settings.MODELS_DIR)` explicitly to ensure models are always read from local storage without requiring Windows Developer Mode.

---

### Limitation 4: Local Loopback Network Binding
- **Description:** UXP plugins execute in an isolated webview. Network communication with local daemons requires explicit domain authorization.
- **Mitigation:**
  - `plugin/manifest.json` authorizes `http://127.0.0.1:8765` and `http://localhost:8765`.
  - Python engine binds strictly to loopback `127.0.0.1`.
  - Session token authentication protects all REST endpoints against external unauthorized calls.

---

### Limitation 5: Hindi Unicode Character Splitting
- **Description:** Standard character-level animations (e.g. splitting strings into single code points) break Devanagari matras, conjuncts (युग्म / संयुक्ताक्षर), and halant ligatures (e.g., "किताब" broken into 'क' + 'ि' + 'त' + 'ा' + 'ब').
- **Mitigation:**
  - CaptionLab enforces **Word-Level Animation** as the core atomic unit for Hindi.
  - Devanagari text is shaped using HarfBuzz/FreeType in FFmpeg and standard DOM shaping in React with Google Fonts (`Noto Sans Devanagari`, `Mukta`, `Hind`).
