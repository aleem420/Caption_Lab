import React, { useState, useEffect } from 'react';
import {
  Mic,
  Cpu,
  Play,
  AlertCircle,
  FileAudio,
  Radio,
  Sparkles,
  ArrowRight,
  Loader2,
  CheckCircle2,
  HelpCircle,
  HardDrive,
  Info,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useProjectStore } from '../../store/projectStore';
import { EngineApiClient, HealthResponse } from '../../services/api';
import { PremiereBridge } from '../../services/premiereBridge';
import { WhisperModelSize, ProcessingDevice, AudioSourceType, ModelInfo, AudioValidationResult } from '../../types';

export const TranscribeTab: React.FC = () => {
  const { setProject, project, setTab } = useProjectStore();
  
  // Audio Source State (Hybrid System: Source A, B, C)
  const [sourceType, setSourceType] = useState<AudioSourceType>('sequence_audio');
  const [filePath, setFilePath] = useState('sequence_mixdown.wav');
  const [rangeStart, setRangeStart] = useState<number | undefined>(undefined);
  const [rangeEnd, setRangeEnd] = useState<number | undefined>(undefined);
  const [showSequenceHelp, setShowSequenceHelp] = useState(false);
  const [validationResult, setValidationResult] = useState<AudioValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Model & Hardware State (Phase 2 Decisions: default is small, base is Fast Mode)
  const [modelSize, setModelSize] = useState<WhisperModelSize>('small');
  const [device, setDevice] = useState<ProcessingDevice>('cpu');
  const [gpuHardwareName, setGpuHardwareName] = useState<string | null>(null);
  const [gpuAvailable, setGpuAvailable] = useState<boolean>(false);
  const [modelCatalog, setModelCatalog] = useState<ModelInfo[]>([]);

  // VAD & Inference State
  const [vadFilter, setVadFilter] = useState(true);
  const [vadThreshold, setVadThreshold] = useState(0.5);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [warningNotice, setWarningNotice] = useState<string | null>(null);

  // Load hardware capabilities & model catalog on mount
  useEffect(() => {
    EngineApiClient.checkHealth()
      .then((res: HealthResponse) => {
        setGpuAvailable(res.gpu_available);
        setGpuHardwareName(res.gpu_name);
        if (res.gpu_available) {
          setDevice('cuda'); // Auto-select CUDA if hardware detected
        }
        if (res.models && res.models.length > 0) {
          setModelCatalog(res.models);
        }
      })
      .catch(() => {});
  }, []);

  // Validate audio file when path or source type changes
  const handleValidateSource = async () => {
    if (!filePath.trim()) return;
    setIsValidating(true);
    setValidationResult(null);
    try {
      const res = await EngineApiClient.validateAudioSource(filePath, sourceType);
      setValidationResult(res);
    } catch {
      // Ignored
    } finally {
      setIsValidating(false);
    }
  };

  const handleStartTranscription = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    setWarningNotice(null);
    setProgressText('Extracting audio & verifying local Whisper model...');

    try {
      // Step 1: Run local speech recognition
      setProgressText(`Loading '${modelSize}' model on ${device.toUpperCase()}...`);
      await new Promise((r) => setTimeout(r, 400));

      setProgressText('Transcribing Hindi & Hinglish with word timestamps...');
      const response = await EngineApiClient.transcribeAudio({
        audio_path: filePath,
        language: 'hindi_mixed',
        model_size: modelSize,
        device: device,
        source_type: sourceType,
        range_start: rangeStart,
        range_end: rangeEnd,
        vad_filter: vadFilter,
        vad_threshold: vadThreshold,
      });

      // Notify user if CUDA fallback occurred (PRD Rule: Never silently switch models/devices)
      if (response.cuda_fallback_occurred) {
        setWarningNotice('Notice: CUDA encountered an issue or was unavailable. Engine safely completed transcription using CPU fallback.');
      }

      // Step 2: Auto-group transcript into readable caption segments
      setProgressText('Calculating dynamic layout & caption grouping...');
      const groupedCaptions = await EngineApiClient.autoGroupCaptions(
        response.words,
        'balanced_two_line',
        project.project.fps || 30.0
      );

      // Step 3: Update Project in store preserving user project structure
      const updatedProject = {
        ...project,
        transcript: {
          language: response.language || 'hindi_mixed',
          engine: 'faster-whisper',
          model_size: modelSize,
          sentences: response.sentences || [],
          words: response.words || [],
        },
        captions: groupedCaptions.length > 0 ? groupedCaptions : project.captions,
      };

      setProject(updatedProject);
      setProgressText('Transcription Complete! Opening Editor...');
      setTimeout(() => {
        setIsProcessing(false);
        setTab('editor');
      }, 700);
    } catch (err: any) {
      setIsProcessing(false);
      setErrorMessage(err.message || 'Transcription error occurred.');
    }
  };

  const currentModelMeta = modelCatalog.find((m) => m.model_id === modelSize) || {
    name: modelSize === 'small' ? 'Small (Factory Default)' : modelSize === 'base' ? 'Base (Fast Mode)' : modelSize,
    size_mb: modelSize === 'small' ? 465 : modelSize === 'base' ? 145 : 75,
    ram_estimate_mb: modelSize === 'small' ? 2000 : 1200,
    vram_estimate_mb: modelSize === 'small' ? 2000 : 1200,
    is_cached: true,
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 overflow-y-auto h-full text-xs">
      <div className="space-y-1">
        <h2 className="text-base font-bold text-white flex items-center space-x-2">
          <Mic className="w-4 h-4 text-blue-400" />
          <span>Speech Recognition & Audio Source Configuration</span>
        </h2>
        <p className="text-xs text-zinc-400">
          Hybrid audio extraction architecture. Preserves Hindi and English Latin terms without forced translation.
        </p>
      </div>

      {/* SECTION 1: HYBRID AUDIO EXTRACTION ARCHITECTURE */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
        <label className="text-xs font-semibold text-zinc-200 flex items-center space-x-1.5">
          <FileAudio className="w-3.5 h-3.5 text-blue-400" />
          <span>Audio Source Architecture (PRD Phase 2 Section 2)</span>
        </label>

        {/* Source selector radio cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {[
            {
              id: 'sequence_audio',
              title: 'Source B: Premiere Sequence Mix',
              badge: 'Recommended',
              desc: 'Exported sequence mixdown. Preserves multi-track audio balance & master effects.',
            },
            {
              id: 'direct_media',
              title: 'Source A: Direct Media File',
              badge: 'Imported Clip',
              desc: 'Direct original video or audio file (WAV, MP3, MP4, MOV). Source file is untouched.',
            },
            {
              id: 'timeline_range',
              title: 'Source C: Timeline Range',
              badge: 'In/Out Range',
              desc: 'Selected in/out range from sequence audio with deterministic frame bounds.',
            },
          ].map((item) => (
            <div
              key={item.id}
              onClick={() => {
                setSourceType(item.id as AudioSourceType);
                setValidationResult(null);
              }}
              className={`p-3 rounded-xl border cursor-pointer transition ${
                sourceType === item.id
                  ? 'border-blue-500 bg-blue-950/25 shadow-sm'
                  : 'border-zinc-800 bg-zinc-950/70 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-xs text-zinc-200">{item.title}</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-mono">
                  {item.badge}
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Sequence Mixdown Step-by-Step Guidance */}
        {sourceType === 'sequence_audio' && (
          <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 space-y-2 text-[11px]">
            <div
              className="flex items-center justify-between cursor-pointer text-zinc-300 font-medium"
              onClick={() => setShowSequenceHelp(!showSequenceHelp)}
            >
              <span className="flex items-center space-x-1.5">
                <Info className="w-3.5 h-3.5 text-blue-400" />
                <span>How to export the Premiere sequence mixdown (Multi-Track Support)</span>
              </span>
              {showSequenceHelp ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </div>
            {showSequenceHelp && (
              <ol className="list-decimal list-inside space-y-1 text-zinc-400 pt-1 pl-1 border-t border-zinc-800">
                {PremiereBridge.getSequenceExportInstructions().map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ol>
            )}
          </div>
        )}

        {/* File Path & Validation Input */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-zinc-400">Media File Path:</span>
            <span className="text-zinc-500 text-[10px]">Supported: WAV, MP3, M4A, AAC, FLAC, MP4, MOV, MKV</span>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={filePath}
              onChange={(e) => setFilePath(e.target.value)}
              placeholder="e.g. C:/Projects/Audio/sequence_mixdown.wav or video.mp4"
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-blue-500 font-mono text-xs"
            />
            <button
              onClick={handleValidateSource}
              disabled={isValidating}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded font-medium transition shrink-0"
            >
              {isValidating ? 'Validating...' : 'Validate File'}
            </button>
          </div>

          {/* Validation Status Badge */}
          {validationResult && (
            <div
              className={`p-2 rounded border text-[11px] flex items-center justify-between ${
                validationResult.is_valid
                  ? 'border-emerald-800/80 bg-emerald-950/20 text-emerald-300'
                  : 'border-red-800/80 bg-red-950/20 text-red-300'
              }`}
            >
              <div className="flex items-center space-x-1.5">
                {validationResult.is_valid ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                )}
                <span>
                  {validationResult.is_valid
                    ? `Valid ${validationResult.format?.toUpperCase()} (${validationResult.duration_seconds?.toFixed(1)}s, ${validationResult.sample_rate}Hz) • Extracted to cache safely`
                    : `File Error: ${validationResult.error_message}`}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Timeline Range Inputs (Source C) */}
        {sourceType === 'timeline_range' && (
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-800 text-[11px]">
            <div>
              <span className="text-zinc-400 block mb-1">Range In Time (seconds):</span>
              <input
                type="number"
                step="0.1"
                placeholder="0.0"
                value={rangeStart ?? ''}
                onChange={(e) => setRangeStart(e.target.value ? parseFloat(e.target.value) : undefined)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-zinc-200"
              />
            </div>
            <div>
              <span className="text-zinc-400 block mb-1">Range Out Time (seconds):</span>
              <input
                type="number"
                step="0.1"
                placeholder="End of range"
                value={rangeEnd ?? ''}
                onChange={(e) => setRangeEnd(e.target.value ? parseFloat(e.target.value) : undefined)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-zinc-200"
              />
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2: WHISPER MODEL CONFIGURATION */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-zinc-200 flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Whisper Model Selection (Phase 2 Requirement)</span>
          </label>
          <span className="text-[10px] text-zinc-400">
            Downloaded models operate 100% offline
          </span>
        </div>

        {/* Model Selection Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
          {[
            {
              id: 'small',
              name: 'Small',
              tag: 'FACTORY DEFAULT',
              isDefault: true,
              size: '~465 MB',
              ram: '~2.0 GB',
              desc: 'Hindi/Hinglish Optimized. Recommended balance of accuracy & speed.',
            },
            {
              id: 'base',
              name: 'Base',
              tag: 'FAST MODE',
              isFast: true,
              size: '~145 MB',
              ram: '~1.2 GB',
              desc: 'High speed draft mode. Good for quick edits.',
            },
            {
              id: 'tiny',
              name: 'Tiny',
              tag: 'DRAFT',
              size: '~75 MB',
              ram: '~1.0 GB',
              desc: 'Ultra lightweight test inference.',
            },
            {
              id: 'medium',
              name: 'Medium',
              tag: 'PRECISION',
              size: '~1.5 GB',
              ram: '~5.0 GB',
              desc: 'High precision for accented or noisy speech.',
            },
            {
              id: 'large',
              name: 'Large-v3',
              tag: 'STUDIO',
              size: '~3.0 GB',
              ram: '~10 GB',
              desc: 'Maximum precision studio transcription.',
            },
          ].map((m) => {
            const isSelected = modelSize === m.id;
            return (
              <div
                key={m.id}
                onClick={() => setModelSize(m.id as WhisperModelSize)}
                className={`p-2.5 rounded-xl border cursor-pointer text-left transition flex flex-col justify-between ${
                  isSelected
                    ? 'border-blue-500 bg-blue-950/30 ring-1 ring-blue-500'
                    : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-zinc-100">{m.name}</span>
                    <span
                      className={`text-[8px] font-bold px-1 py-0.2 rounded uppercase ${
                        m.isDefault
                          ? 'bg-blue-600 text-white'
                          : m.isFast
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {m.tag}
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-400 mb-1">{m.desc}</div>
                </div>

                <div className="pt-2 border-t border-zinc-800/80 text-[9px] text-zinc-500 space-y-0.5">
                  <div className="flex justify-between">
                    <span>Disk Size:</span>
                    <span className="text-zinc-300 font-mono">{m.size}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Est. Memory:</span>
                    <span className="text-zinc-300 font-mono">{m.ram}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 3: HARDWARE ACCELERATION & VAD SETTINGS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Device Selection with CUDA Fallback Notice */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
          <label className="text-xs font-semibold text-zinc-200 flex items-center space-x-1.5">
            <Cpu className="w-3.5 h-3.5 text-zinc-400" />
            <span>Processing Device & Acceleration</span>
          </label>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setDevice('cpu')}
              className={`p-2.5 rounded-lg border text-left transition ${
                device === 'cpu'
                  ? 'border-blue-500 bg-blue-950/30 text-white'
                  : 'border-zinc-800 bg-zinc-950 text-zinc-400'
              }`}
            >
              <div className="font-medium text-xs">CPU Universal</div>
              <div className="text-[10px] text-zinc-500">int8 quantization. 100% compatible.</div>
            </button>

            <button
              onClick={() => {
                if (gpuAvailable) setDevice('cuda');
              }}
              disabled={!gpuAvailable}
              className={`p-2.5 rounded-lg border text-left transition ${
                device === 'cuda'
                  ? 'border-blue-500 bg-blue-950/30 text-white'
                  : gpuAvailable
                  ? 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                  : 'border-zinc-900 bg-zinc-950/40 text-zinc-600 cursor-not-allowed'
              }`}
            >
              <div className="font-medium text-xs flex items-center space-x-1">
                <span>NVIDIA CUDA</span>
                {gpuAvailable && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
              </div>
              <div className="text-[10px] text-zinc-500 truncate">
                {gpuHardwareName ? gpuHardwareName : 'No compatible CUDA GPU detected'}
              </div>
            </button>
          </div>

          <p className="text-[10px] text-zinc-500">
            If CUDA encounters memory limits or driver issues, CaptionLab automatically falls back to CPU without failing or crashing.
          </p>
        </div>

        {/* Silero VAD Settings */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-200">Voice Activity Detection (VAD)</span>
            <button
              onClick={() => setVadFilter(!vadFilter)}
              className={`w-9 h-5 rounded-full transition-colors p-0.5 ${
                vadFilter ? 'bg-blue-600' : 'bg-zinc-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  vadFilter ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="space-y-1.5 text-[11px] text-zinc-400">
            <div className="flex justify-between">
              <span>Speech Sensitivity Threshold:</span>
              <span className="font-mono text-zinc-200">{vadThreshold.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="0.9"
              step="0.05"
              value={vadThreshold}
              onChange={(e) => setVadThreshold(parseFloat(e.target.value))}
              disabled={!vadFilter}
              className="w-full accent-blue-600 disabled:opacity-40"
            />
            <span className="text-[10px] text-zinc-500 block">
              Silero VAD filters background pauses, music, and quiet gaps between spoken sentences.
            </span>
          </div>
        </div>
      </div>

      {/* Warnings & Notices */}
      {warningNotice && (
        <div className="p-3 bg-amber-950/40 border border-amber-800/80 text-amber-200 text-xs rounded-xl flex items-center space-x-2">
          <Info className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{warningNotice}</span>
        </div>
      )}

      {/* Errors */}
      {errorMessage && (
        <div className="p-3 bg-red-950/50 border border-red-800 text-red-200 text-xs rounded-xl flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* PRE-FLIGHT SUMMARY & START TRANSCRIPTION (PRD Section 3 Requirement) */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-blue-950/30 border border-zinc-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-1">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold block">
            Ready to Transcribe Summary
          </span>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 font-mono">
              Source: {sourceType === 'sequence_audio' ? 'Sequence Mix' : sourceType === 'direct_media' ? 'Direct Media' : 'Range'}
            </span>
            <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 font-bold border border-blue-800/60">
              Model: {modelSize.toUpperCase()} ({modelSize === 'small' ? 'Factory Default' : modelSize === 'base' ? 'Fast Mode' : 'Draft'})
            </span>
            <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-200">
              Device: {device.toUpperCase()}
            </span>
            <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800/60">
              Lang: Hindi Mixed
            </span>
          </div>
        </div>

        <button
          onClick={handleStartTranscription}
          disabled={isProcessing}
          className="flex items-center justify-center space-x-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-lg hover:shadow-blue-600/30 transition shrink-0"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{progressText}</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-white" />
              <span>Start Hindi Transcription</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
