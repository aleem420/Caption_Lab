# CAPTIONLAB — MILESTONE 6.0
# TECHNICAL RISK REGISTER & MITIGATION STRATEGY

**Product:** CaptionLab — Words into Motion  
**Target:** Milestone 6 Production Readiness & Windows Distribution  
**Scope:** Architectural, Operational, Host, Hardware, and Security Risks  
**Date:** November 21, 2026  

---

## 1. RISK ASSESSMENT METHODOLOGY

Risks are categorized and scored according to standard enterprise software risk criteria:

$$\text{Risk Score} = \text{Likelihood } (1\text{ to }5) \times \text{Impact } (1\text{ to }5)$$

- **Critical / High (Score 15 – 25):** Fatal failure, crash, data loss, or complete failure to run on target systems. Immediate P0 architectural mitigation mandatory.
- **Moderate (Score 8 – 14):** Degraded user experience, performance penalty, or edge-case failure with partial recovery. P1 mitigation required.
- **Low (Score 1 – 7):** Minor cosmetic or logging issue with simple workaround. P2 mitigation.

---

## 2. RISK MATRIX SUMMARY

| Risk ID | Title | Category | Likelihood | Impact | Score | Level |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| **RSK-01** | Windows UAC Permission Denial in `Program Files` | Storage / OS | 5 | 5 | **25** | **CRITICAL** |
| **RSK-02** | First-Run Offline Failure on Whisper Model Download | Offline / UX | 5 | 5 | **25** | **CRITICAL** |
| **RSK-03** | Port 8765 Socket Collision / Orphan Zombie Daemon | Lifecycle / OS | 4 | 4 | **16** | **HIGH** |
| **RSK-04** | PyInstaller Dynamic DLL Resolution Failures (CTranslate2/CUDA) | Packaging | 4 | 4 | **16** | **HIGH** |
| **RSK-05** | Antivirus False-Positive Heuristics on Bundled Engine | Security / OS | 4 | 4 | **16** | **HIGH** |
| **RSK-06** | Premiere External UXP Directory Drift across Adobe Releases | Host / UXP | 3 | 5 | **15** | **HIGH** |
| **RSK-07** | GPU VRAM Exhaustion During Concurrent Premiere 4K Playback | Hardware / AI | 3 | 4 | **12** | **MEDIUM** |
| **RSK-08** | Unbounded Temp Disk Exhaustion from Interrupted Exports | Filesystem | 4 | 3 | **12** | **MEDIUM** |
| **RSK-09** | SQLite Database Corruption on Unexpected Termination | Persistence | 2 | 5 | **10** | **MEDIUM** |
| **RSK-10** | Hardcoded Windows Drive `C:\` Font Resolution Failures | Typography | 3 | 3 | **9** | **MEDIUM** |
| **RSK-11** | Unauthenticated Local Loopback API Exposure | Security | 3 | 3 | **9** | **MEDIUM** |
| **RSK-12** | Synchronous Threadpool Starvation on Large Exports | Performance | 3 | 3 | **9** | **MEDIUM** |

---

## 3. DETAILED RISK AUDIT & MITIGATION REGISTER

---

### RSK-01: Windows UAC Permission Denial in `Program Files`
- **Category:** Storage / OS Security
- **Likelihood:** 5 | **Impact:** 5 | **Risk Score:** 25 (**CRITICAL**)
- **Symptoms / Failure Mode:**
  When CaptionLab is installed into standard system directories (e.g. `C:\Program Files\CaptionLab`), any attempt to initialize SQLite database tables (`captionlab.db`), write user presets, download models, or generate audio caches immediately crashes with `PermissionError: [WinError 5] Access is denied`.
- **Root Cause in Codebase:**
  `engine/app/core/config.py` lines 12–17 define `DATA_DIR`, `MODELS_DIR`, `AUDIO_CACHE_DIR`, and `RENDERS_DIR` relative to `BASE_DIR = Path(__file__).resolve().parent.parent.parent` (inside the installation root).
- **Mitigation Strategy (M6.1):**
  Relocate all mutable paths to Windows standard user locations:
  - Database, presets, models: `%LOCALAPPDATA%\CaptionLab\`
  - Transient audio cache and renders: `%TEMP%\CaptionLab\`
  - The installer installs to `%LOCALAPPDATA%\Programs\CaptionLab`, requiring zero administrator rights.
- **Verification Method:**
  Run automated test suite inside a read-only directory simulating standard Windows non-admin execution.

---

### RSK-02: First-Run Offline Failure on Whisper Model Download
- **Category:** Offline / User Experience
- **Likelihood:** 5 | **Impact:** 5 | **Risk Score:** 25 (**CRITICAL**)
- **Symptoms / Failure Mode:**
  A video editor on an air-gapped studio workstation or without internet access installs CaptionLab, imports a media file, and clicks Transcribe. The backend attempts to download the model from Hugging Face, times out, and raises an unhandled HTTP connection exception, rendering the product completely inoperable.
- **Root Cause in Codebase:**
  `engine/app/services/transcription.py` lines 246–251 call `WhisperModel(model_size, ...)` directly. If the model is not cached in `MODELS_DIR`, Faster-Whisper blocks and makes network calls.
- **Mitigation Strategy (M6.4):**
  1. Pre-bundle the factory-default **Small** model snapshot (`~465 MB`) directly inside the Windows installer package.
  2. The installer automatically extracts this snapshot into `%LOCALAPPDATA%\CaptionLab\models_cache\`.
  3. Provide an explicit offline verification test during installer build.
- **Verification Method:**
  Disconnect all network adapters on a clean VM, install via installer, and execute transcription test.

---

### RSK-03: Port 8765 Socket Collision / Orphan Zombie Daemon
- **Category:** Lifecycle / OS Networking
- **Likelihood:** 4 | **Impact:** 4 | **Risk Score:** 16 (**HIGH**)
- **Symptoms / Failure Mode:**
  If CaptionLab terminates abnormally or if the user launches multiple instances, an orphaned `captionlab-engine.exe` process continues running on port 8765. The new engine instance fails to bind to port 8765 with `OSError: [WinError 10048] Only one usage of each socket address is normally permitted` and crashes.
- **Root Cause in Codebase:**
  `engine/run.py` calls `uvicorn.run(...)` without checking whether port 8765 is already bound by an existing instance, and without a Windows named mutex.
- **Mitigation Strategy (M6.1 & M6.3):**
  1. Implement a Windows Named Mutex (`Global\CaptionLabEngineMutex`) in the engine entrypoint.
  2. If mutex exists, send a health ping to `http://127.0.0.1:8765/health/`. If responsive, reuse the existing daemon instead of crashing.
  3. In the Tauri Desktop Shell, the process supervisor tracks the child PID and terminates it forcefully on app exit.
- **Verification Method:**
  Launch two consecutive engine instances in PowerShell; verify that the second instance detects the first and exits cleanly without error.

---

### RSK-04: PyInstaller Dynamic DLL Resolution Failures (CTranslate2/CUDA)
- **Category:** Packaging / Native Dependencies
- **Likelihood:** 4 | **Impact:** 4 | **Risk Score:** 16 (**HIGH**)
- **Symptoms / Failure Mode:**
  After building with PyInstaller, the frozen executable crashes immediately on launch with `ImportError: DLL load failed while importing _ctranslate2: The specified module could not be found` or `CUDA error: no kernel image is available for execution on the device`.
- **Root Cause in Codebase:**
  CTranslate2, PyTorch, and Pillow with LibRaqm load native C/C++ DLLs dynamically (`cublas64_*.dll`, `cudnn64_*.dll`, `libraqm.dll`, `fribidi-0.dll`). PyInstaller's static dependency analysis frequently misses runtime dynamically loaded libraries.
- **Mitigation Strategy (M6.2):**
  1. Use `collect_dynamic_libs('ctranslate2')` and `collect_dynamic_libs('torch')` in `captionlab_engine.spec`.
  2. Explicitly package native `libraqm.dll` and its companion libraries (`fribidi.dll`, `harfbuzz.dll`) in the root binary directory.
  3. Validate the frozen binary against dependency walker tools (`dumpbin /dependents`).
- **Verification Method:**
  Run `dist_engine/captionlab-engine/captionlab-engine.exe` on a clean Windows machine without Python installed.

---

### RSK-05: Antivirus False-Positive Heuristics on Bundled Engine
- **Category:** Security / OS Ecosystem
- **Likelihood:** 4 | **Impact:** 4 | **Risk Score:** 16 (**HIGH**)
- **Symptoms / Failure Mode:**
  Windows Defender SmartScreen or third-party antivirus (Norton, McAfee, Bitdefender) blocks or quarantines `captionlab-engine.exe` upon download or launch due to generic PyInstaller bootloader signatures.
- **Root Cause:**
  PyInstaller's default pre-compiled bootloader binary is occasionally flagged by generic behavioral heuristics if untrusted and unsigned.
- **Mitigation Strategy (M6.2 & M6.6):**
  1. Recompile the PyInstaller bootloader locally from source (`pyinstaller/bootloader`) so its cryptographic hash is unique.
  2. Digitally sign `CaptionLab.exe`, `captionlab-engine.exe`, and the Inno Setup installer with a valid Authenticode Code Signing Certificate.
  3. Submit release binaries to Microsoft Defender Security Intelligence for proactive whitelist clearance prior to distribution.
- **Verification Method:**
  Scan release installer with Windows Defender and VirusTotal API before publication.

---

### RSK-06: Premiere External UXP Directory Drift across Adobe Releases
- **Category:** Host / Host Integration
- **Likelihood:** 3 | **Impact:** 5 | **Risk Score:** 15 (**HIGH**)
- **Symptoms / Failure Mode:**
  Adobe Premiere Pro 2025/2026 fails to discover the CaptionLab UXP panel under `Window > Extensions` after installation.
- **Root Cause in Codebase:**
  If Adobe changes the external plugin lookup path or if the plugin folder name does not strictly match `{id}_{version}`, the host ignores the plugin bundle.
- **Mitigation Strategy (M6.6):**
  1. Follow Adobe's strict external plugin naming convention:
     `%APPDATA%\Adobe\UXP\Plugins\External\com.captionlab.premiere_1.2.0\`
  2. Installer script verifies whether the target directory exists and logs installation path to `%LOCALAPPDATA%\CaptionLab\logs\install.log`.
  3. Provide a fallback button in the Standalone Companion Settings: *"Re-install Premiere Pro UXP Plugin"*, allowing one-click repair without re-running the installer.
- **Verification Method:**
  Test installation across both Premiere Pro 2025 (v25.x) and Premiere Pro 2026 (v26.5.3) test environments.

---

### RSK-07: GPU VRAM Exhaustion During Concurrent Premiere 4K Playback
- **Category:** Hardware / Resource Contention
- **Likelihood:** 3 | **Impact:** 4 | **Risk Score:** 12 (**MEDIUM**)
- **Symptoms / Failure Mode:**
  If an editor transcribes a video while Premiere Pro is simultaneously rendering or playing back a heavy 4K Lumetri Color sequence, GPU VRAM runs out, triggering `torch.cuda.OutOfMemoryError` or CTranslate2 memory fault.
- **Root Cause in Codebase:**
  `engine/app/services/transcription.py` handles CUDA fallback on device initialization, but VRAM can be exhausted mid-execution during inference.
- **Mitigation Strategy (M6.1):**
  1. Wrap `whisper.transcribe(...)` inside a `try...except RuntimeError` block checking for `"out of memory"`.
  2. If VRAM runs out, immediately clear PyTorch CUDA cache (`torch.cuda.empty_cache()`), unload the GPU model, reload in CPU `int8` mode, and seamlessly resume transcription.
  3. Surface a non-blocking toast in the UI: *"GPU memory was exhausted by host video playback. Switched safely to CPU acceleration."*
- **Verification Method:**
  Simulate VRAM pressure via synthetic memory allocation script during transcription; verify automatic CPU recovery.

---

### RSK-08: Unbounded Temp Disk Exhaustion from Interrupted Exports
- **Category:** Filesystem / Hygiene
- **Likelihood:** 4 | **Impact:** 3 | **Risk Score:** 12 (**MEDIUM**)
- **Symptoms / Failure Mode:**
  When rendering a 10-minute 30 FPS video, ~18,000 uncompressed RGBA PNG frames (~15 GB) are written to temporary scratch folders. If the application is closed or crashes during render, these frames remain indefinitely on disk.
- **Root Cause in Codebase:**
  `export_service.py` lines 337 and 424 create directories via `tempfile.mkdtemp(prefix="captionlab_render_")`. Cleanup occurs only in `finally:` blocks, which are skipped if the process is terminated via Task Manager, reboot, or system crash.
- **Mitigation Strategy (M6.1 & M6.5):**
  1. Add an engine startup hygiene routine in `app/main.py`:
     ```python
     def purge_orphaned_render_scratch():
         temp_dir = Path(settings.APP_TEMP_DIR)
         for folder in temp_dir.glob("captionlab_render_*"):
             try:
                 if (time.time() - folder.stat().st_mtime) > 7200: # Older than 2 hours
                     shutil.rmtree(folder, ignore_errors=True)
             except Exception:
                 pass
     ```
  2. Execute this sweep automatically on every engine launch.
- **Verification Method:**
  Create synthetic stale render folders with modified timestamps; launch engine and verify automatic cleanup.

---

### RSK-09: SQLite Database Corruption on Unexpected Termination
- **Category:** Persistence / Data Integrity
- **Likelihood:** 2 | **Impact:** 5 | **Risk Score:** 10 (**MEDIUM**)
- **Symptoms / Failure Mode:**
  If a laptop loses battery or the computer crashes while `captionlab.db` is being updated, the SQLite file can become malformed, preventing projects from loading on subsequent launches.
- **Root Cause in Codebase:**
  `db.py` uses standard SQLite journal mode (`DELETE`), which is vulnerable to corruption if writes are interrupted midway through disk flush.
- **Mitigation Strategy (M6.5):**
  1. Enable Write-Ahead Logging (WAL) mode on startup:
     ```sql
     PRAGMA journal_mode = WAL;
     PRAGMA synchronous = NORMAL;
     ```
  2. Implement an automated rolling backup: on engine startup, `captionlab.db` is copied to `%LOCALAPPDATA%\CaptionLab\data\backups\captionlab_backup_latest.db`.
  3. If primary database fails integrity check (`PRAGMA integrity_check;`), offer instant recovery from the backup.
- **Verification Method:**
  Simulate power interruption during SQLite write; verify WAL recovery and integrity check pass.

---

### RSK-10: Hardcoded Windows Drive `C:\` Font Resolution Failures
- **Category:** Typography / OS Configuration
- **Likelihood:** 3 | **Impact:** 3 | **Risk Score:** 9 (**MEDIUM**)
- **Symptoms / Failure Mode:**
  On multi-drive workstations where Windows is installed on drive `D:\` or `E:\`, font lookup fails to find system fonts, causing text to render as missing glyph boxes.
- **Root Cause in Codebase:**
  `font_service.py` line 25 hardcodes `Path("C:/Windows/Fonts")`.
- **Mitigation Strategy (M6.1):**
  Use dynamic environment variables:
  ```python
  windir = os.environ.get("WINDIR", os.environ.get("SYSTEMROOT", "C:\\Windows"))
  system_font_dir = Path(windir) / "Fonts"
  ```
  Additionally, bundle `NotoSansDevanagari-Bold.ttf` in `engine/assets/fonts/` as an absolute internal fallback.
- **Verification Method:**
  Test font resolution on a test profile with altered `%WINDIR%`.

---

### RSK-11: Unauthenticated Local Loopback API Exposure
- **Category:** Security / Process Isolation
- **Likelihood:** 3 | **Impact:** 3 | **Risk Score:** 9 (**MEDIUM**)
- **Symptoms / Failure Mode:**
  Malicious local applications or browser scripts on arbitrary tabs could potentially query `http://127.0.0.1:8765/render/export` to trigger heavy disk writes or inspect user projects.
- **Root Cause in Codebase:**
  `security.py` line 19 returns `True` unconditionally, bypassing session token checks.
- **Mitigation Strategy (M6.1):**
  1. Generate a high-entropy 32-character session token on engine launch.
  2. Pass this token to the UXP plugin via secure bootstrap handshake and to Tauri desktop shell via launch argument.
  3. Enforce `X-CaptionLab-Token` header check on all non-health API endpoints.
  4. Restrict CORS origins strictly to loopback and Adobe UXP panel contexts.
- **Verification Method:**
  Attempt unauthenticated `POST /render/export` request via `curl.exe`; verify `HTTP 401 Unauthorized` response.

---

### RSK-12: Synchronous Threadpool Starvation on Large Exports
- **Category:** Performance / Responsiveness
- **Likelihood:** 3 | **Impact:** 3 | **Risk Score:** 9 (**MEDIUM**)
- **Symptoms / Failure Mode:**
  During multi-minute exports, the UXP panel or Standalone UI shows the red "Engine Offline" banner because health check HTTP calls timeout while the Python threadpool is saturated rendering frames.
- **Root Cause in Codebase:**
  `export_captions` in `render.py` executes synchronously, monopolizing the worker thread.
- **Mitigation Strategy (M6.5):**
  1. Run frame rendering inside a dedicated background thread with `asyncio.to_thread`.
  2. Maintain a responsive event loop that answers `GET /health/` within $< 10\text{ms}$ even under 100% export load.
  3. Expose render job status via async polling or SSE stream.
- **Verification Method:**
  Execute a 10-minute video export benchmark while continuously querying `/health/` every 500ms; verify zero dropped or timed-out health responses.
