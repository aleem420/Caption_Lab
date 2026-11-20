import React, { useState } from 'react';
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
  ExternalLink,
} from 'lucide-react';
import { useProjectStore } from '../../store/projectStore';
import { EngineApiClient } from '../../services/api';
import { PremiereBridge } from '../../services/premiereBridge';

export const ExportTab: React.FC = () => {
  const { project } = useProjectStore();
  const [outputType, setOutputType] = useState<'both' | 'prores_4444' | 'srt' | 'png_sequence'>('both');
  const [resolution, setResolution] = useState<{ width: number; height: number }>({ width: 1920, height: 1080 });
  const [fps, setFps] = useState<number>(30.0);
  const [filenamePrefix, setFilenamePrefix] = useState('CaptionLab_Hindi_Captions');
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    setErrorMsg(null);
    setExportResult(null);

    try {
      const res = await EngineApiClient.exportCaptions({
        output_type: outputType,
        captions: project.captions,
        resolution,
        fps,
        filename_prefix: filenamePrefix,
      });
      setExportResult(res);
      setIsExporting(false);
    } catch (err: any) {
      setIsExporting(false);
      setErrorMsg(err.message || 'Export failed.');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 overflow-y-auto h-full text-xs">
      <div className="space-y-1">
        <h2 className="text-base font-bold text-white flex items-center space-x-2">
          <Download className="w-4 h-4 text-emerald-400" />
          <span>Export Engine — Subtitles, ProRes & Image Sequences</span>
        </h2>
        <p className="text-xs text-zinc-400">
          Export editable native subtitles (SRT / WebVTT) or broadcast-grade transparent ProRes 4444 MOV / PNG sequences with alpha transparency for Adobe Premiere Pro.
        </p>
      </div>

      {/* Output Format Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
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
            <label className="text-[11px] text-zinc-400 block mb-1">Export Resolution</label>
            <select
              value={`${resolution.width}x${resolution.height}`}
              onChange={(e) => {
                const [w, h] = e.target.value.split('x').map(Number);
                setResolution({ width: w, height: h });
              }}
              className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-200"
            >
              <option value="1920x1080">1920 × 1080 (16:9 Landscape / YouTube)</option>
              <option value="1080x1920">1080 × 1920 (9:16 Vertical / Reels & Shorts)</option>
              <option value="1080x1080">1080 × 1080 (1:1 Square / Instagram)</option>
              <option value="1080x1350">1080 × 1350 (4:5 Portrait / Feed)</option>
            </select>
          </div>

          {/* FPS */}
          <div>
            <label className="text-[11px] text-zinc-400 block mb-1">Sequence Frame Rate</label>
            <select
              value={fps}
              onChange={(e) => setFps(parseFloat(e.target.value))}
              className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-200"
            >
              <option value="23.976">23.976 FPS (Cinematic)</option>
              <option value="24">24 FPS (Film standard)</option>
              <option value="25">25 FPS (PAL)</option>
              <option value="29.97">29.97 FPS (NTSC)</option>
              <option value="30">30 FPS (Standard Digital)</option>
              <option value="60">60 FPS (High Frame Rate)</option>
            </select>
          </div>

          {/* Filename */}
          <div>
            <label className="text-[11px] text-zinc-400 block mb-1">File Prefix</label>
            <input
              type="text"
              value={filenamePrefix}
              onChange={(e) => setFilenamePrefix(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-200"
            />
          </div>
        </div>
      </div>

      {/* Error alert */}
      {errorMsg && (
        <div className="p-3 bg-red-950/50 border border-red-800 text-red-200 text-xs rounded-xl flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Success Result Card */}
      {exportResult && (
        <div className="bg-emerald-950/30 border border-emerald-800/80 rounded-xl p-4 space-y-3">
          <div className="flex items-center space-x-2 text-emerald-400 font-semibold text-xs">
            <CheckCircle2 className="w-4 h-4" />
            <span>Render Completed Successfully!</span>
          </div>

          <div className="space-y-1.5 text-xs">
            {exportResult.files?.mov_path && (
              <div className="p-2.5 bg-zinc-950 rounded border border-zinc-800">
                <span className="text-[10px] text-zinc-500 uppercase font-mono block">ProRes 4444 MOV (Alpha):</span>
                <span className="font-mono text-zinc-200 text-[11px] truncate block mt-0.5">
                  {exportResult.files.mov_path}
                </span>
              </div>
            )}
            {exportResult.files?.png_sequence && (
              <div className="p-2.5 bg-zinc-950 rounded border border-zinc-800">
                <span className="text-[10px] text-zinc-500 uppercase font-mono block">
                  PNG Sequence ({exportResult.files.png_sequence.total_frames} frames @ {exportResult.files.png_sequence.fps}fps):
                </span>
                <span className="font-mono text-zinc-200 text-[11px] truncate block mt-0.5">
                  {exportResult.files.png_sequence.output_directory}
                </span>
              </div>
            )}
            {exportResult.files?.srt_path && (
              <div className="p-2.5 bg-zinc-950 rounded border border-zinc-800">
                <span className="text-[10px] text-zinc-500 uppercase font-mono block">Native SRT (UTF-8 Devanagari):</span>
                <span className="font-mono text-zinc-200 text-[11px] truncate block mt-0.5">
                  {exportResult.files.srt_path}
                </span>
              </div>
            )}
          </div>

          {/* Premiere Import Workflow Guidance */}
          <div className="pt-2 border-t border-emerald-900/50 text-[11px] text-zinc-300 space-y-1">
            <span className="font-semibold text-emerald-300">Premiere Pro Timeline Placement Steps:</span>
            <ol className="list-decimal list-inside text-zinc-400 space-y-0.5 pl-1">
              {PremiereBridge.getImportWorkflowInstructions('', outputType === 'png_sequence' ? 'png' : outputType === 'srt' ? 'srt' : 'mov').map((step, idx) => (
                <li key={idx}>{step}</li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {/* Action Button */}
      <div className="flex justify-end">
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="flex items-center space-x-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-lg hover:shadow-emerald-600/30 transition"
        >
          {isExporting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Rendering Frame-Accurate Output...</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>Render & Export Captions</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
