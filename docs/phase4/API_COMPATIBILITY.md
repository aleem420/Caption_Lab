# Adobe Premiere Pro 2025+ UXP API Compatibility Specification

**Document Version:** 1.0  
**Target Host:** Adobe Premiere Pro 2025+ (Version 25.0.0 and above)  
**Host Architecture:** Adobe Unified Extensibility Platform (UXP) v7 / v8  
**Operating System:** Windows 10 / 11 (64-bit)  

---

## 1. Adobe Premiere Pro UXP Architecture Context

In Adobe Premiere Pro 2025 (v25+), Adobe transitioned from legacy Common Extensibility Platform (CEP / ExtendScript) to modern **UXP (Unified Extensibility Platform)**. 

### Key Characteristics of Premiere Pro UXP:
1. **JavaScript V8 Engine:** Standard ECMAScript 2020+ modern JavaScript runtime.
2. **HTML/CSS Rendering Engine:** Native UXP layout engine and WebView rendering.
3. **Module Resolution:** Access to host modules via `require('premierepro')` and `require('uxp')`.
4. **Manifest Specification:** Requires `manifestVersion: 5` with host target `"app": "premierepro"` and `"minVersion": "25.0.0"`.
5. **Permissions Sandbox:**
   - Network access is strictly restricted to domains explicitly listed in `manifest.json` under `requiredPermissions.network.domains` (`http://127.0.0.1:8765`, `http://localhost:8765`).
   - Local filesystem access requires `requiredPermissions.localFileSystem: "fullAccess"`.

---

## 2. API Capability Matrix

The following table documents verified UXP API capabilities vs. unsupported or restricted operations in Adobe Premiere Pro 2025+:

| Operation | Premiere Pro UXP API | Status | Technical Implementation / Fallback |
|---|---|---|---|
| **Plugin Loading & Panel Lifecycle** | UXP Entrypoint `panel` | **Supported & Verified** | Configured in `manifest.json` with `com.captionlab.premiere`. Loaded via Adobe UXP Developer Tool. |
| **Host Application Detection** | `require('premierepro').app` | **Supported & Verified** | Checks `app` object and host application identifier. If null or undefined, gracefully identifies Standalone/Preview mode. |
| **Active Sequence Query** | `app.project.activeSequence` | **Supported & Verified** | Retrieves active sequence reference if a sequence is open in timeline. |
| **Sequence Name & Dimensions** | `seq.name`, `seq.frameSizeHorizontal`, `seq.frameSizeVertical` | **Supported & Verified** | Used to calculate composition aspect ratios (16:9, 9:16, 1:1) and pixel dimensions deterministically. |
| **Sequence Timebase & FPS** | `seq.timebase` | **Supported & Verified** | Maps ticks/timebase to deterministic rational frame rates (23.976, 24, 25, 29.97, 30, 60 FPS). |
| **Sequence Duration & Playhead** | `seq.end.seconds`, `seq.getPlayerPosition().seconds` | **Supported & Verified** | Provides current sequence duration and playhead offset. |
| **Direct Timeline Audio Extraction** | `seq.exportAudio()` / internal buffer | **UNSUPPORTED in UXP v25.0** | **Architectural Decision:** Premiere Pro UXP does not provide a direct streaming audio buffer API to JavaScript. **Supported Fallback:** CaptionLab guides the user to export the sequence audio mixdown (Ctrl+M > Waveform Audio / MP3) or select imported project clips. |
| **Individual Audio Track Isolation** | `seq.audioTracks[i].getRawBuffer()` | **UNSUPPORTED in UXP v25.0** | Direct raw PCM buffer access per track is not exposed to UXP plugins. Sequence mixdown captures multi-track dialogue accurately without distortion. |
| **Programmatic Timeline Track Creation** | `seq.createTrack("subtitle")` | **RESTRICTED / UNSTABLE in UXP v25.0** | Programmatic caption track creation through UXP lacks cross-minor-version stability. **Supported Fallback:** Native SRT import into Premiere Pro Project bin, dragged to subtitle track. |
| **Direct Video Clip Insertion** | `seq.videoTracks[1].insertClip()` | **RESTRICTED in UXP v25.0** | Programmatic clip insertion on specific video tracks without user interaction is unreliable across Premiere 2025 point releases. **Supported Fallback:** Verified user workflow (import ProRes 4444 MOV to bin -> drop onto track V2). |
| **Loopback Networking** | `fetch('http://127.0.0.1:8765/...')` | **Supported & Verified** | Authorized via manifest `network.domains`. Enables communication with local Python processing engine. |
| **Local File System Access** | `require('uxp').storage.localFileSystem` | **Supported & Verified** | Allows reading media files and writing project composition JSONs. |

---

## 3. Host Compatibility Rules

1. **Strict No-Fake-Integration Rule:** When running outside Premiere Pro (such as during Vite preview or browser development), CaptionLab explicitly flags `isAvailableInHost: false` and displays "Preview Mode (Standalone)" rather than faking active sequence communication.
2. **Missing Active Sequence Graceful Handling:** If Premiere Pro is running but no sequence is currently active, CaptionLab alerts the user: *"No active sequence detected in Premiere timeline. Please open a sequence or import a direct media file."* It never throws uncaught exceptions or fails to render.
3. **Deterministic Rational Frame Timing:** Audio and animation timings use exact rational fractions rather than floating-point timebases to ensure zero drift across NTSC (29.97 FPS, 59.94 FPS) and PAL (25 FPS) project settings.
