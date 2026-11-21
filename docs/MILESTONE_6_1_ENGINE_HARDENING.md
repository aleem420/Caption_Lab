# CAPTIONLAB — MILESTONE 6.1
# ENGINE HARDENING & WINDOWS CONFIGURATION RELOCATION REPORT

**Product:** CaptionLab — Words into Motion  
**Phase:** Milestone 6.1: Engine Hardening & Windows Configuration Relocation  
**Repository:** `https://github.com/aleem420/Caption_Lab`  
**Baseline Commit:** `852e187aaedeb41f3971476e2dfda1a3c4116322`  
**Execution Date:** November 21, 2026  
**Status:** **COMPLETE — ALL 86 AUTOMATED TESTS PASS (100%)**  

---

## 1. EXECUTIVE SUMMARY & OBJECTIVE

Milestone 6.1 hardens the CaptionLab FastAPI backend engine and relocates its storage architecture to conform strictly with standard Windows desktop application conventions. 

Prior to M6.1, CaptionLab relied on in-repository mutable storage (`engine/data/`, `engine/models_cache/`, `engine/renders/`), hardcoded Windows drive letters (`C:/Windows/Fonts`), a development security bypass in `security.py` returning `True` unconditionally, and lacked single-instance daemon supervision.

Milestone 6.1 successfully resolved all these liabilities without breaking backward compatibility, preserving all working functionality from Milestones 1–5, passing 86/86 automated tests, and keeping frontend builds clean.

---

## 2. WORKSTREAM A — WINDOWS STORAGE DIRECTORY ARCHITECTURE

### 2.1 Storage Separation Matrix
All persistent user data is now cleanly decoupled from application binaries and repository code:

| Storage Role | Path | Environment Root | Lifecycle & Purpose |
| :--- | :--- | :--- | :--- |
| **Persistent Database** | `%LOCALAPPDATA%\CaptionLab\data\captionlab.db` | `%LOCALAPPDATA%` | SQLite user projects, settings, presets, font catalog |
| **Model Storage** | `%LOCALAPPDATA%\CaptionLab\models_cache\` | `%LOCALAPPDATA%` | Faster-Whisper model snapshots (HuggingFace Hub) |
| **Persistent Logs** | `%LOCALAPPDATA%\CaptionLab\logs\engine.log` | `%LOCALAPPDATA%` | Rotating engine execution logs (5 MB max, 3 backups) |
| **Rolling Backups** | `%LOCALAPPDATA%\CaptionLab\backups\` | `%LOCALAPPDATA%` | Periodic project database backups |
| **User Presets** | `%LOCALAPPDATA%\CaptionLab\config\` | `%LOCALAPPDATA%` | Custom style preset export/import metadata |
| **Audio Cache** | `%TEMP%\CaptionLab\audio_cache\` | `%TEMP%` | Ephemeral 16kHz normalized mono WAV audio mixdowns |
| **Render Scratch** | `%TEMP%\CaptionLab\renders\` | `%TEMP%` | Ephemeral 32-bit RGBA PNG frame sequences |
| **Job Temp Files** | `%TEMP%\CaptionLab\jobs\` | `%TEMP%` | Intermediate FFmpeg export scratch buffers |

### 2.2 UAC Protection & Write Validation
In `engine/app/core/config.py`, `Settings.ensure_directories_exist()`:
1. Dynamically resolves `%LOCALAPPDATA%` and `%TEMP%` via `os.environ` with fallback to `Path.home()` or `tempfile.gettempdir()`.
2. Creates all required directories with `.mkdir(parents=True, exist_ok=True)`.
3. Performs an active writability validation probe (creating and deleting `.write_test`).
4. If permission is denied, raises a clear, actionable `PermissionError` rather than crashing during inference or render.
5. Protects against UAC permission denials when CaptionLab is installed under `C:\Program Files`.

---

## 3. SAFE LEGACY DATA MIGRATION

Implemented in `engine/app/services/migration_service.py` and invoked on engine startup in `lifespan`:

1. **Non-Destructive Guarantee:** Legacy files in `engine/data/` or `engine/models_cache/` are **never deleted**.
2. **SQLite Online Backup API:** Uses `src_conn.backup(dst_conn)` to perform a transaction-safe, uncorrupted backup of `engine/data/captionlab.db` into `%LOCALAPPDATA%\CaptionLab\data\captionlab.db`.
3. **Database Integrity Verification:** Executes `PRAGMA integrity_check;` on the newly migrated database before activating it.
4. **Conflict Resolution & Idempotency:**
   - If destination database already exists, migration is skipped, both files are preserved untouched, and the status is logged as `destination_already_exists_preserved`.
   - Repeated runs do not duplicate or overwrite data.
5. **Models Migration:** Any pre-existing HuggingFace model cache directories in `engine/models_cache/` are copied safely to `%LOCALAPPDATA%\CaptionLab\models_cache\`.

---

## 4. WORKSTREAM B — DYNAMIC FONT DIRECTORY RESOLUTION

Implemented in `engine/app/services/font_service.py`:

1. **No Drive Letter Assumptions:** Replaced hardcoded `C:/Windows/Fonts` with dynamic `%WINDIR%\Fonts` using `os.environ.get("WINDIR")` or `os.environ.get("SYSTEMROOT")`.
2. **Multi-Source Font Discovery:**
   - `%WINDIR%\Fonts` (System fonts).
   - `%LOCALAPPDATA%\Microsoft\Windows\Fonts` (Per-user installed fonts).
   - `%LOCALAPPDATA%\CaptionLab\fonts` (Custom user fonts).
   - Bundled application fonts (`assets/fonts` and `engine/assets/fonts`).
   - PyInstaller frozen runtime fallback (`sys._MEIPASS/assets/fonts`).
3. **Devanagari Font Hierarchy:** Prioritizes `Noto Sans Devanagari`, `Mangal`, `Nirmala UI`, `Mukta`, and `Hind`, falling back gracefully without crashing or throwing unhandled exceptions.

---

## 5. WORKSTREAM C — SECURE SESSION TOKEN & ROUTE PROTECTION

### 5.1 Architecture & Bypass Removal
1. **Removed Development Bypass:** Eliminated the development bypass in `engine/app/core/security.py` that returned `True` unconditionally.
2. **Constant-Time Verification:** Employs `secrets.compare_digest(token, settings.SESSION_TOKEN)` to prevent timing side-channel attacks.
3. **Loopback-Only Bootstrap:** `GET /health/` provides the session token only to loopback clients (`127.0.0.1`, `::1`, `localhost`, `testclient`) with trusted origins (`localhost`, `tauri://`, `plugin://`, `null`). Untrusted remote web origins receive `"session_token": "REDACTED"`.
4. **Header Enforcement:** All protected routes require `X-CaptionLab-Token: <token>`. Requests with missing or invalid tokens receive `HTTP 401 Unauthorized`.

### 5.2 Complete Route Security Matrix

| Endpoint | Method | Read/Write | Authentication | Security Justification |
| :--- | :---: | :---: | :---: | :--- |
| `GET /` | GET | Read | **Public** | Engine online status & basic version banner |
| `GET /health/` | GET | Read | **Public / Bootstrap** | Health check & safe session bootstrap for trusted loopback origins |
| `GET /health/diagnostics` | GET | Read | **Protected (401)** | Exposes hardware, memory, disk metrics, and environment specs |
| `GET /transcribe/models` | GET | Read | **Protected (401)** | Exposes installed model sizes and memory footprint |
| `POST /transcribe/validate-source` | POST | Read/Write | **Protected (401)** | Extracts 16kHz mono audio cache to disk |
| `POST /transcribe/path` | POST | Read/Write | **Protected (401)** | Transcribes local audio/video media via Faster-Whisper |
| `POST /transcribe/upload` | POST | Read/Write | **Protected (401)** | Handles file upload and transcription |
| `POST /transcribe/analyze-quality`| POST | Read | **Protected (401)** | Executes NLP quality analysis on transcript words |
| `POST /transcribe/refine` | POST | Read | **Protected (401)** | Performs AI grammar cleanup and Hindi transliteration |
| `POST /render/export` | POST | Read/Write | **Protected (401)** | Generates ProRes 4444, PNG sequences, and MP4 files |
| `POST /render/layout/auto-group` | POST | Read | **Protected (401)** | Computes responsive layout bounding boxes |
| `POST /projects/save` | POST | Read/Write | **Protected (401)** | Writes user project state to SQLite database |
| `GET /projects/get/{project_id}` | GET | Read | **Protected (401)** | Retrieves user project state by ID |
| `GET /projects/recent` | GET | Read | **Protected (401)** | Lists user recent projects and timestamps |
| `GET /presets/all` | GET | Read | **Protected (401)** | Lists built-in and user custom style presets |
| `GET /presets/fonts` | GET | Read | **Protected (401)** | Lists available system fonts on disk |
| `GET /presets/{preset_id}` | GET | Read | **Protected (401)** | Retrieves specific preset parameters |
| `POST /presets/save` | POST | Read/Write | **Protected (401)** | Saves user custom preset to SQLite |
| `DELETE /presets/{preset_id}` | DELETE | Read/Write | **Protected (401)** | Removes user custom preset from SQLite |
| `GET /presets/export/{preset_id}` | GET | Read | **Protected (401)** | Exports preset definition as JSON |
| `POST /presets/import` | POST | Read/Write | **Protected (401)** | Imports external preset JSON into database |

---

## 6. WORKSTREAM D — WINDOWS SINGLE-INSTANCE ENGINE MUTEX

Implemented in `engine/app/core/mutex.py` and `engine/run.py`:

1. **Windows Named Mutex:** Uses `ctypes.windll.kernel32.CreateMutexW` with mutex identifier `Local\CaptionLabEngineMutex`.
2. **Second-Instance Detection:** If `GetLastError() == ERROR_ALREADY_EXISTS (183)`:
   - The second instance closes its handle immediately to prevent kernel handle leaks.
   - Pings `http://127.0.0.1:8765/health/` with a 2.0-second timeout.
   - If responsive: Logs that the engine is already running and healthy, and **exits cleanly with status code 0**.
   - If not responsive: Warns that the mutex is held while the port is not responding, guiding the user without terminating unrelated processes.
3. **Safe Shutdown Release:** Registers `atexit` cleanup and context manager release to call `ReleaseMutex` and `CloseHandle` cleanly on normal shutdown.

---

## 7. WORKSTREAM E — CENTRALIZED ROTATING LOGGING

Implemented in `engine/app/core/logging_config.py`:

1. **Persistent Output:** Writes to `%LOCALAPPDATA%\CaptionLab\logs\engine.log`.
2. **Log Rotation:** `RotatingFileHandler` with $5\text{ MB}$ maximum file size and $3$ backup files ($20\text{ MB}$ total log cap).
3. **Token Scrubbing:** `TokenFilter` intercepts all log records before output and redacts `settings.SESSION_TOKEN` to `••••••••[REDACTED]`.
4. **Structured Format:** `%(asctime)s [%(levelname)s] [%(name)s]: %(message)s`.

---

## 8. AUTOMATED TEST VALIDATION & RESULTS

### 8.1 Test Breakdown

| Test Suite File | Coverage Scope | Tests | Result | Duration |
| :--- | :--- | :---: | :---: | :---: |
| `tests/run_tests.py` | Core health, Whisper models, Hindi transcription, CUDA fallback | 12 | **PASS** | 24.2s |
| `tests/test_visual_qa.py` | Devanagari ligatures, 8 layout families, animation curves, ProRes alpha | 16 | **PASS** | 4.8s |
| `tests/test_stress_and_benchmarks.py` | Diagnostics, token masking, 30/60m stress, temp cleanup | 5 | **PASS** | 1.1s |
| `tests/test_project_persistence.py` | SQLite save, load, recent projects, schema updates | 5 | **PASS** | 0.8s |
| `tests/test_milestone5_motion_engine.py` | 6 animation curves, cubic-bezier easings, word pop | 5 | **PASS** | 0.5s |
| `tests/test_milestone5_ai_intelligence.py` | Auto-grouping, keyword emphasis, grammar cleanup, Hindi transliteration | 5 | **PASS** | 0.4s |
| `tests/test_milestone5_design_and_presets.py` | 12 style presets, custom preset CRUD, font discovery, MP4 burn-in | 6 | **PASS** | 1.9s |
| `tests/test_milestone6_1_engine_hardening.py` | Storage relocation, migration, dynamic fonts, token security, mutex, logging | 13 | **PASS** | 1.9s |
| **Subtotal (Main Regression Suite)** | `python engine/tests/run_all_tests.py` | **67** | **PASS** | **34.9s** |
| `tests/test_milestone3_e2e.py` | End-to-end media validation, Devanagari text, ProRes 4444, Premiere 2023 | 19 | **PASS** | 37.7s |
| **Grand Total Unique Tests** | **All automated test suites** | **86** | **PASS** | **72.6s** |

### 8.2 Frontend Build Status
- `plugin/` (UXP Plugin): `npm run build` $\longrightarrow$ **PASS** (`main.js` $273.99\text{ kB}$, `main.css` $29.34\text{ kB}$).
- `standalone/` (Companion): `npm run build` $\longrightarrow$ **PASS** (`index.js` $291.65\text{ kB}$, `index.css` $30.57\text{ kB}$).

---

## 9. KNOWN LIMITATIONS & TRANSITION TO M6.2

With Milestone 6.1 completed:
1. CaptionLab is now fully decoupled from in-repo storage and safe for standard Windows user installations.
2. The engine requires no administrator rights and cannot be blocked by Windows UAC.
3. The remaining work for Windows distribution is **Milestone 6.2 (Python Engine Bundling & Toolchain Embedding)**, which will freeze the engine into `captionlab-engine.exe` using PyInstaller `--onedir` and bundle static `ffmpeg.exe` binaries.
