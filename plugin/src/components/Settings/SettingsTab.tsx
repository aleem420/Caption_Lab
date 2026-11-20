import React, { useEffect, useState } from 'react';
import {
  Settings as SettingsIcon,
  ShieldCheck,
  Server,
  Cpu,
  RefreshCw,
  CheckCircle,
  Video,
  Key,
} from 'lucide-react';
import { EngineApiClient, HealthResponse } from '../../services/api';
import { PremiereBridge, HostStatus } from '../../services/premiereBridge';
import { useProjectStore } from '../../store/projectStore';

export const SettingsTab: React.FC = () => {
  const { engineConnected, setEngineConnected } = useProjectStore();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [hostStatus, setHostStatus] = useState<HostStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkConnection = async () => {
    setIsChecking(true);
    try {
      const data = await EngineApiClient.checkHealth();
      setHealth(data);
      setEngineConnected(true);
    } catch {
      setEngineConnected(false);
      setHealth(null);
    } finally {
      setIsChecking(false);
      setHostStatus(PremiereBridge.getHostStatus());
    }
  };

  useEffect(() => {
    checkConnection();
    setHostStatus(PremiereBridge.getHostStatus());
  }, []);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6 overflow-y-auto h-full text-xs">
      <div className="space-y-1">
        <h2 className="text-base font-bold text-white flex items-center space-x-2">
          <SettingsIcon className="w-4 h-4 text-zinc-400" />
          <span>CaptionLab Diagnostics & Engine Configuration</span>
        </h2>
        <p className="text-xs text-zinc-400">
          Local-first architecture. 100% offline, zero cloud API fees, zero telemetry.
        </p>
      </div>

      {/* Host Status Card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center space-x-2 font-semibold text-zinc-200">
          <Video className="w-4 h-4 text-purple-400" />
          <span>Adobe Premiere Pro Host Diagnostics</span>
        </div>
        <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-zinc-500 uppercase font-semibold">Host Environment:</span>
            <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
              hostStatus?.isAvailableInHost ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60' : 'bg-zinc-800 text-zinc-400'
            }`}>
              {hostStatus?.isAvailableInHost ? 'Premiere Pro UXP Active' : 'Standalone / Preview'}
            </span>
          </div>
          <div className="text-[11px] text-zinc-300">
            {hostStatus?.statusMessage}
          </div>
          {hostStatus?.sequence && (
            <div className="text-[10px] text-zinc-500 font-mono pt-1 border-t border-zinc-800/80">
              Sequence: {hostStatus.sequence.name} • {hostStatus.sequence.width}x{hostStatus.sequence.height} @ {hostStatus.sequence.fps}fps ({hostStatus.sequence.aspectRatio})
            </div>
          )}
        </div>
      </div>

      {/* Engine Status Card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 font-semibold text-zinc-200">
            <Server className="w-4 h-4 text-blue-400" />
            <span>Local Python Engine (FastAPI)</span>
          </div>
          <button
            onClick={checkConnection}
            disabled={isChecking}
            className="flex items-center space-x-1 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded transition"
          >
            <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
            <span>Refresh Diagnostics</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800">
            <span className="text-[10px] text-zinc-500 uppercase block">Engine Connectivity:</span>
            <div className="flex items-center space-x-1.5 mt-1">
              <span
                className={`w-2 h-2 rounded-full ${
                  engineConnected ? 'bg-emerald-500' : 'bg-red-500'
                }`}
              />
              <span className="font-semibold text-zinc-200">
                {engineConnected ? 'Online (127.0.0.1:8765)' : 'Disconnected'}
              </span>
            </div>
          </div>

          <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800">
            <span className="text-[10px] text-zinc-500 uppercase block">FFmpeg ProRes Encoder:</span>
            <div className="flex items-center space-x-1.5 mt-1">
              <span
                className={`w-2 h-2 rounded-full ${
                  health?.ffmpeg_available ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
              <span className="font-semibold text-zinc-200">
                {health?.ffmpeg_available ? 'Available (prores_ks)' : 'Checking...'}
              </span>
            </div>
          </div>

          <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800">
            <span className="text-[10px] text-zinc-500 uppercase block">Hardware Device:</span>
            <div className="flex items-center space-x-1.5 mt-1">
              <Cpu className="w-3.5 h-3.5 text-blue-400" />
              <span className="font-semibold text-zinc-200 truncate">
                {health?.gpu_name || 'CPU Only'}
              </span>
            </div>
          </div>

          <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800">
            <span className="text-[10px] text-zinc-500 uppercase block">Session Token Security:</span>
            <div className="flex items-center space-x-1.5 mt-1">
              <Key className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-mono text-zinc-300 text-[11px]">
                {EngineApiClient.getMaskedToken()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Security & Local First Guarantees */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center space-x-2 font-semibold text-zinc-200">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Product Principles & Privacy (PRD Section 1.5)</span>
        </div>
        <div className="space-y-2 text-zinc-400 text-[11px] leading-relaxed">
          <div className="flex items-center space-x-2 text-zinc-300">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Zero Paid AI APIs: Powered by offline Faster-Whisper models.</span>
          </div>
          <div className="flex items-center space-x-2 text-zinc-300">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Zero Mandatory Cloud Subscriptions: No internet needed once models are cached.</span>
          </div>
          <div className="flex items-center space-x-2 text-zinc-300">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Hindi-First Typography: Grapheme-aware segmentation preserving matras and ligatures.</span>
          </div>
          <div className="flex items-center space-x-2 text-zinc-300">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Non-Destructive Editing: User modifications are protected with property provenance.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
