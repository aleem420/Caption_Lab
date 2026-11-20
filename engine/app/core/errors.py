"""
CaptionLab Error Catalog & Diagnostic Codes
Phase 4 Milestone 5
Provides human-readable, structured error codes and troubleshooting guidance.
"""

from typing import Dict, Any

ERROR_CATALOG: Dict[str, Dict[str, str]] = {
    # 1000s: Audio & Source Media Errors
    "CL-ERR-1001": {
        "code": "CL-ERR-1001",
        "title": "Audio File Not Found",
        "message": "The specified audio or video file could not be found at the provided path.",
        "remedy": "Verify that the media file path exists and has read permissions."
    },
    "CL-ERR-1002": {
        "code": "CL-ERR-1002",
        "title": "Unsupported Audio Format",
        "message": "The media format is not supported by the extraction engine.",
        "remedy": "Supported formats: WAV, MP3, M4A, AAC, FLAC, OGG, MP4, MOV, MKV, WebM."
    },
    "CL-ERR-1003": {
        "code": "CL-ERR-1003",
        "title": "Empty Audio File",
        "message": "The media file contains zero bytes or an empty audio stream (< 0.05s).",
        "remedy": "Ensure the audio was exported with active sound on the timeline."
    },
    "CL-ERR-1004": {
        "code": "CL-ERR-1004",
        "title": "Audio Extraction Failed",
        "message": "FFmpeg was unable to extract or decode the audio stream.",
        "remedy": "Check whether the media file is corrupted or locked by another application."
    },

    # 2000s: AI Engine & Model Errors
    "CL-ERR-2001": {
        "code": "CL-ERR-2001",
        "title": "Model Snapshot Missing",
        "message": "The selected Faster-Whisper model is not available in local models_cache/.",
        "remedy": "Connect to the network once to download the model, or choose a cached model."
    },
    "CL-ERR-2002": {
        "code": "CL-ERR-2002",
        "title": "CUDA Out Of Memory",
        "message": "GPU VRAM was exhausted while processing audio segments.",
        "remedy": "CaptionLab automatically falls back to CPU int8 processing. Consider using 'small' or 'base' model."
    },
    "CL-ERR-2003": {
        "code": "CL-ERR-2003",
        "title": "CUDA Device Unavailable",
        "message": "No compatible NVIDIA CUDA device was detected by CTranslate2.",
        "remedy": "Engine safely uses CPU int8 acceleration. Ensure NVIDIA GPU drivers are installed."
    },
    "CL-ERR-2004": {
        "code": "CL-ERR-2004",
        "title": "Model Download Interrupted",
        "message": "A network interruption occurred during model download, leaving partial files.",
        "remedy": "CaptionLab automatically purges corrupt temporary caches on restart and resumes safely."
    },

    # 3000s: Rendering & FFmpeg Export Errors
    "CL-ERR-3001": {
        "code": "CL-ERR-3001",
        "title": "FFmpeg Binary Not Found",
        "message": "FFmpeg is not available in the system PATH.",
        "remedy": "Install FFmpeg with ProRes and FreeType support and add it to system PATH."
    },
    "CL-ERR-3002": {
        "code": "CL-ERR-3002",
        "title": "ProRes Encoding Failed",
        "message": "FFmpeg returned a non-zero exit code during ProRes 4444 encoding.",
        "remedy": "Verify sufficient disk space in the destination folder."
    },
    "CL-ERR-3003": {
        "code": "CL-ERR-3003",
        "title": "Missing Render Frames",
        "message": "One or more frame images were missing or empty during sequence compilation.",
        "remedy": "Ensure no external process or antivirus deleted temporary frames in the render folder."
    },

    # 4000s: Host & Timeline Errors
    "CL-ERR-4001": {
        "code": "CL-ERR-4001",
        "title": "Active Sequence Not Detected",
        "message": "No sequence is currently active in the Premiere Pro timeline.",
        "remedy": "Open a sequence in Premiere Pro or switch to Direct Media mode."
    },
    "CL-ERR-4002": {
        "code": "CL-ERR-4002",
        "title": "Invalid Timeline Range",
        "message": "The selected in-point is negative or greater than or equal to the out-point.",
        "remedy": "Verify in/out timecodes in the range inputs."
    }
}

def get_error(code: str) -> Dict[str, str]:
    return ERROR_CATALOG.get(code, {
        "code": code,
        "title": "Unknown Error",
        "message": "An unspecified error occurred.",
        "remedy": "Check system logs or restart the CaptionLab engine."
    })
