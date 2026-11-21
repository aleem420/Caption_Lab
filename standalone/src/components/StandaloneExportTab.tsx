import React, { useState, useEffect } from 'react';
import {
  Download,
  Film,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Layers,
  Copy,
  FolderOpen,
} from 'lucide-react';
import { useProjectStore } from '@plugin/store/projectStore';
import { EngineApiClient } from '@plugin/services/api';
import { useSequenceStore } from '../store/sequenceStore';

export const StandaloneExportTab: React.FC = () => {
  const { project } = useProjectStore();
  const { width, height, fps, projectName } = useSequenceStore();

  const [outputType, setOutputType] = useState<'both' | 'prores_4444' | 'srt' | 'png_sequence' | 'mp4'>('both');
  const [resolution, setResolution] = useState<{ width: number; height: number }>({ width, height });
  const [exportFps, setExportFps] = useState<number>(fps);
  const [filenamePrefix, setFilenamePrefix] = useState('CaptionLab_Premiere2023_Captions');
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  // Synchronize with sequence settings
  useEffect(() => {
    setResolution({ width, height });
    setExportFps(fps);
  }, [width, height, fps]);

  const handleExport = async () => {
    setIsExporting(true);
    setErrorMsg(null);
    setExportResult(null);

    try {
      const res = await EngineApiClient.exportCaptions({
        output_type: outputType,
        captions: project.captions,
        resolution,
        fps: exportFps,
        filename_prefix: filenamePrefix,
      });
      setExportResult(res);
      setIsExporting(false);
    } catch (err: any) {
      setIsExporting(false);
      setErrorMsg(err.message || 'Export failed.');
    }
  };

  const handleCopyPath = (path: string) => {
    navigator.clipboard.writeText(path);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 overflow-y-auto h-full text-xs">
      <div className="space-y-1">
        <h2 className="text-base font-bold text-white flex items-center space-x-2">
          <Download className="w-4 h-4 text-emerald-400" />
          <span>Premiere Pro 2023 Export Engine</span>
        </h2>
        <p className="text-xs text-zinc-400">
          Export editable native subtitles (SRT / WebVTT) or broadcast-grade transparent ProRes 4444 MOV / PNG sequences with alpha transparency for Adobe Premiere Pro 2023 (v23.5).
        </p>
      </div>

      {/* Output Format Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
        {[
          {
            id: 'both',
            title: 'Dual Output',
            badge: 'ProRes + SRT',
            desc: 'Both transparent video overlay and editable native subtitles.',
            icon: <Sparkles className="w-4 h-4 text-amber-400" />,
          },
          {
            id: 'prores_4444',
            title: 'Transparent MOV',
            badge: 'ProRes 4444 Alpha',
            desc: 'Single transparent video clip with word pop & karaoke animations.',
            icon: <Film className="w-4 h-4 text-blue-400" />,
          },
          {
            id: 'png_sequence',
            title: 'PNG Sequence',
            badge: 'RGBA 32-bit',
            desc: 'Transparent image sequence (frame_000000.png) with missing-frame detection.',
            icon: <Layers className="w-4 h-4 text-purple-400" />,
          },
          {
            id: 'mp4',
            title: 'Burned-in MP4',
            badge: 'H.264 Video',
            desc: 'Self-contained video with burned-in animated captions for social sharing.',
            icon: <Film className="w-4 h-4 text-rose-400" />,
          },
          {
            id: 'srt',
            title: 'Native Subtitles',
            badge: 'SRT + WebVTT',
            desc: 'Editable caption format compatible with Premiere Essential Graphics.',
            icon: <FileText className="w-4 h-4 text-emerald-400" />,
          },
        ].map((fmt) => (
          <div
            key={fmt.id}
            onClick={() => setOutputType(fmt.id as any)}
            className={`p-3 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
              outputType === fmt.id
                ? 'border-emerald-500 bg-emerald-950/25 shadow-md ring-1 ring-emerald-500'
                : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                {fmt.icon}
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-mono">
                  {fmt.badge}
                </span>
              </div>
              <div className="text-xs font-semibold text-zinc-200">{fmt.title}</div>
              <div className="text-[10px] text-zinc-400 mt-1 leading-relaxed">{fmt.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Export Configuration Form */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Resolution */}
          <div>
            <label className="text-[10px] uppercase font-semibold text-zinc-400 block mb-1">
              Sequence Resolution
            </label>
            <div className="px-2.5 py-1.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-200 font-mono text-xs">
              {resolution.width} × {resolution.height}
            </div>
            <span className="text-[10px] text-zinc-500 mt-0.5 block">Synced from Sequence Settings</span>
          </div>

          {/* FPS */}
          <div>
            <label className="text-[10px] uppercase font-semibold text-zinc-400 block mb-1">
              Frame Rate (FPS)
            </label>
            <div className="px-2.5 py-1.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-200 font-mono text-xs">
              {exportFps} FPS
            </div>
            <span className="text-[10px] text-zinc-500 mt-0.5 block">Deterministic rational timing</span>
          </div>

          {/* Filename Prefix */}
          <div>
            <label className="text-[10px] uppercase font-semibold text-zinc-400 block mb-1">
              Output Filename Prefix
            </label>
            <input
              type="text"
              value={filenamePrefix}
              onChange={(e) => setFilenamePrefix(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-emerald-500 font-mono text-xs"
            />
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
          <div className="text-[11px] text-zinc-400">
            Exporting <strong>{project.captions.length}</strong> animated caption blocks. Zero loss of Devanagari ligatures.
          </div>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg font-semibold transition shadow-md shadow-emerald-950 text-xs"
          >
            {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            <span>{isExporting ? 'Rendering via Local FFmpeg...' : 'Start Export'}</span>
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-950/40 border border-red-800 rounded-lg text-red-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Export Result & Premiere 2023 Placement Guidance */}
      {exportResult && (
        <div className="bg-emerald-950/20 border border-emerald-800/80 rounded-xl p-4 space-y-3">
          <div className="flex items-center space-x-2 font-semibold text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Export Complete — Ready for Premiere Pro 2023 Import</span>
          </div>

          <div className="space-y-2">
            {exportResult.files?.prores_4444 && (
              <div className="p-2.5 bg-zinc-950 rounded-lg border border-zinc-800 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-zinc-400 uppercase font-semibold">ProRes 4444 Transparent MOV:</div>
                  <div className="font-mono text-zinc-200 text-xs truncate max-w-lg mt-0.5">
                    {exportResult.files.prores_4444.file_path}
                  </div>
                </div>
                <button
                  onClick={() => handleCopyPath(exportResult.files.prores_4444.file_path)}
                  className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[10px] flex items-center space-x-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedPath === exportResult.files.prores_4444.file_path ? 'Copied!' : 'Copy Path'}</span>
                </button>
              </div>
            )}

            {exportResult.files?.srt && (
              <div className="p-2.5 bg-zinc-950 rounded-lg border border-zinc-800 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-zinc-400 uppercase font-semibold">Native Subtitles (UTF-8 SRT):</div>
                  <div className="font-mono text-zinc-200 text-xs truncate max-w-lg mt-0.5">
                    {exportResult.files.srt.file_path}
                  </div>
                </div>
                <button
                  onClick={() => handleCopyPath(exportResult.files.srt.file_path)}
                  className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[10px] flex items-center space-x-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedPath === exportResult.files.srt.file_path ? 'Copied!' : 'Copy Path'}</span>
                </button>
              </div>
            )}

            {exportResult.files?.png_sequence && (
              <div className="p-2.5 bg-zinc-950 rounded-lg border border-zinc-800 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-zinc-400 uppercase font-semibold">
                    PNG Sequence ({exportResult.files.png_sequence.total_frames} frames @ {exportResult.files.png_sequence.fps}fps):
                  </div>
                  <div className="font-mono text-zinc-200 text-xs truncate max-w-lg mt-0.5">
                    {exportResult.files.png_sequence.directory}
                  </div>
                </div>
                <button
                  onClick={() => handleCopyPath(exportResult.files.png_sequence.directory)}
                  className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[10px] flex items-center space-x-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedPath === exportResult.files.png_sequence.directory ? 'Copied!' : 'Copy Path'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Premiere Pro 2023 Step-by-Step Instructions */}
          <div className="p-3 bg-zinc-900 rounded-lg border border-zinc-800 space-y-1.5 text-zinc-300">
            <span className="text-[10px] uppercase font-semibold text-zinc-400 block">
              Premiere Pro 2023 Import & Synchronization:
            </span>
            <ol className="list-decimal list-inside space-y-1 text-[11px] leading-relaxed">
              <li>Open your project in <strong>Adobe Premiere Pro 2023</strong> (v23.5).</li>
              <li>Drag the exported ProRes 4444 MOV or PNG sequence directly into the <strong>Project bin</strong>.</li>
              <li>Drag the clip onto video track <strong>V2</strong> directly above your video on <strong>V1</strong>.</li>
              <li>The background is 100% transparent. Animated Hindi captions with word pop and karaoke highlights overlay seamlessly.</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
};
