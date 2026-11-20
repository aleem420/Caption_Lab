import React, { useState } from 'react';
import {
  Mic,
  Cpu,
  Sliders,
  Play,
  CheckCircle,
  AlertCircle,
  FileAudio,
  Radio,
  Sparkles,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { useProjectStore } from '../../store/projectStore';
import { EngineApiClient } from '../../services/api';
import { WhisperModelSize, ProcessingDevice } from '../../types';

export const TranscribeTab: React.FC = () => {
  const { setProject, project, setTab } = useProjectStore();
  const [audioSource, setAudioSource] = useState<'sequence' | 'range' | 'file'>('sequence');
  const [filePath, setFilePath] = useState('demo_recording.wav');
  const [modelSize, setModelSize] = useState<WhisperModelSize>('base');
  const [device, setDevice] = useState<ProcessingDevice>('cpu');
  const [vadFilter, setVadFilter] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleStartTranscription = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    setProgressText('Extracting audio & initializing local Whisper model...');

    try {
      // Step 1: Run local speech recognition
      setProgressText('Detecting speech segments with Silero VAD...');
      await new Promise((r) => setTimeout(r, 600));

      setProgressText('Transcribing Hindi & Hinglish with word-level timestamps...');
      const response = await EngineApiClient.transcribeAudio({
        audio_path: filePath,
        language: 'hindi_mixed',
        model_size: modelSize,
        device: device,
      });

      // Step 2: Auto-group transcript into readable caption segments
      setProgressText('Calculating dynamic layout & caption grouping...');
      const groupedCaptions = await EngineApiClient.autoGroupCaptions(
        response.words,
        'balanced_two_line',
        project.project.fps || 30.0
      );

      // Step 3: Update Project in store
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

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 overflow-y-auto h-full">
      <div className="space-y-1">
        <h2 className="text-base font-bold text-white flex items-center space-x-2">
          <Mic className="w-4 h-4 text-blue-400" />
          <span>Speech Recognition & Transcription</span>
        </h2>
        <p className="text-xs text-zinc-400">
          Configure offline transcription parameters. Hindi and English mixed audio will be preserved in their native scripts without forced translation.
        </p>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Audio Source Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
          <label className="text-xs font-semibold text-zinc-300 flex items-center space-x-1.5">
            <FileAudio className="w-3.5 h-3.5 text-zinc-400" />
            <span>Audio Source Workflow</span>
          </label>
          <div className="space-y-2">
            {[
              { id: 'sequence', title: 'Active Sequence Audio', desc: 'Direct audio track from Premiere Pro timeline' },
              { id: 'range', title: 'Selected Timeline Range', desc: 'In/Out playhead markers range' },
              { id: 'file', title: 'Imported Audio/Video File', desc: 'Local WAV, MP3, MP4 or MOV file' },
            ].map((opt) => (
              <label
                key={opt.id}
                onClick={() => setAudioSource(opt.id as any)}
                className={`flex items-start space-x-3 p-2.5 rounded-lg border cursor-pointer transition ${
                  audioSource === opt.id
                    ? 'border-blue-500 bg-blue-950/20'
                    : 'border-zinc-800 bg-zinc-950/50 hover:border-zinc-700'
                }`}
              >
                <input
                  type="radio"
                  name="audioSource"
                  checked={audioSource === opt.id}
                  onChange={() => setAudioSource(opt.id as any)}
                  className="mt-0.5 text-blue-600 focus:ring-0"
                />
                <div>
                  <div className="text-xs font-medium text-zinc-200">{opt.title}</div>
                  <div className="text-[10px] text-zinc-400">{opt.desc}</div>
                </div>
              </label>
            ))}
          </div>

          {audioSource === 'file' && (
            <div className="pt-2">
              <label className="text-[11px] text-zinc-400 block mb-1">Local File Path:</label>
              <input
                type="text"
                value={filePath}
                onChange={(e) => setFilePath(e.target.value)}
                className="w-full text-xs bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-blue-500"
                placeholder="C:/media/sample_audio.wav"
              />
            </div>
          )}
        </div>

        {/* Model & Device Configuration */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4">
          <label className="text-xs font-semibold text-zinc-300 flex items-center space-x-1.5">
            <Cpu className="w-3.5 h-3.5 text-zinc-400" />
            <span>AI Model & Acceleration</span>
          </label>

          {/* Model Size */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px]">
              <span className="text-zinc-400">Faster-Whisper Model:</span>
              <span className="text-blue-400 font-medium uppercase">{modelSize}</span>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {(['tiny', 'base', 'small', 'medium', 'large'] as WhisperModelSize[]).map((size) => (
                <button
                  key={size}
                  onClick={() => setModelSize(size)}
                  className={`py-1.5 rounded text-xs font-medium uppercase transition ${
                    modelSize === size
                      ? 'bg-blue-600 text-white shadow'
                      : 'bg-zinc-950 text-zinc-400 border border-zinc-800 hover:border-zinc-700 hover:text-zinc-200'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
            <span className="text-[10px] text-zinc-500 block">
              Base/Small recommended for balanced speed & Hindi accuracy.
            </span>
          </div>

          {/* Device */}
          <div className="space-y-1.5">
            <span className="text-[11px] text-zinc-400 block">Inference Device:</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setDevice('cpu')}
                className={`py-1.5 px-3 rounded text-xs font-medium flex items-center justify-center space-x-1.5 border transition ${
                  device === 'cpu'
                    ? 'border-blue-500 bg-blue-950/30 text-blue-300'
                    : 'border-zinc-800 bg-zinc-950 text-zinc-400'
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>CPU (Universal)</span>
              </button>
              <button
                onClick={() => setDevice('cuda')}
                className={`py-1.5 px-3 rounded text-xs font-medium flex items-center justify-center space-x-1.5 border transition ${
                  device === 'cuda'
                    ? 'border-blue-500 bg-blue-950/30 text-blue-300'
                    : 'border-zinc-800 bg-zinc-950 text-zinc-400'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>NVIDIA CUDA (GPU)</span>
              </button>
            </div>
          </div>

          {/* VAD Toggle */}
          <div className="flex items-center justify-between pt-1 border-t border-zinc-800/80">
            <div>
              <div className="text-xs text-zinc-300 font-medium">Silero Voice Activity Detection</div>
              <div className="text-[10px] text-zinc-500">Filters out background noise & silence</div>
            </div>
            <button
              onClick={() => setVadFilter(!vadFilter)}
              className={`w-10 h-5 rounded-full transition-colors p-0.5 ${
                vadFilter ? 'bg-blue-600' : 'bg-zinc-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  vadFilter ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Error alert */}
      {errorMessage && (
        <div className="p-3 bg-red-950/50 border border-red-800 text-red-200 text-xs rounded-xl flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Action Bar */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-zinc-200">Transcription Mode: Hindi Mixed</div>
          <div className="text-[10px] text-zinc-400">
            Preserves Devanagari Hindi + Latin English script as spoken.
          </div>
        </div>

        <button
          onClick={handleStartTranscription}
          disabled={isProcessing}
          className="flex items-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-lg hover:shadow-blue-600/30 transition"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{progressText}</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-white" />
              <span>Generate Hindi Transcript</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
