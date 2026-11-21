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
  Layers,
  Activity,
  HardDrive,
} from 'lucide-react';
import { EngineApiClient, HealthResponse, ENGINE_BASE_URL } from '@plugin/services/api';
import { useProjectStore } from '@plugin/store/projectStore';
import { useSequenceStore } from '../store/sequenceStore';

export const StandaloneSettingsTab: React.FC = () => {
  const { engineConnected, setEngineConnected } = useProjectStore();
  const { projectName, width, height, fps, aspectRatio, timelineOffset } = useSequenceStore();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [diagnostics, setDiagnostics] = useState<any | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isLoadingDiag, setIsLoadingDiag] = useState(false);

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
    }
  };

  const fetchDiagnostics = async () => {
    setIsLoadingDiag(true);
    try {
      const token = EngineApiClient.getToken();
      const res = await fetch(`${ENGINE_BASE_URL}/health/diagnostics`, {
        headers: token ? { 'X-CaptionLab-Token': token } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setDiagnostics(data);
      }
    } catch {
      // Ignored
    } finally {
      setIsLoadingDiag(false);
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6 overflow-y-auto h-full text-xs">
      <div className="space-y-1">
        <h2 className="text-base font-bold text-white flex items-center space-x-2">
          <SettingsIcon className="w-4 h-4 text-zinc-400" />
          <span>CaptionLab Diagnostics & Engine Configuration</span>
        </h2>
        <p className="text-xs text-zinc-400">
          Standalone Companion Architecture. 100% offline, zero cloud API fees, zero telemetry.
        </p>
      </div>

      {/* Host Status Card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center space-x-2 font-semibold text-zinc-200">
          <Video className="w-4 h-4 text-amber-400" />
          <span>Host Integration Diagnostics</span>
        </div>
        <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-zinc-500 uppercase font-semibold">Execution Mode:</span>
            <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-amber-500/10 text-amber-300 border border-amber-500/30">
              Standalone Companion (Browser Mode)
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-zinc-500 uppercase font-semibold">Target NLE Host:</span>
            <span className="text-[10px] text-zinc-200 font-medium">
              Adobe Premiere Pro 2023 (v23.5) & Supported Hosts
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-zinc-500 uppercase font-semibold">Timeline Integration:</span>
            <span className="text-[10px] text-emerald-400 font-medium">
              Manual Sync • ProRes 4444 / PNG on Track V2 • SRT on Subtitle Track
            </span>
          </div>
          <div className="text-[10px] text-zinc-500 font-mono pt-1.5 border-t border-zinc-800/80">
            Active Sequence: {projectName} • {width}×{height} @ {fps}fps ({aspectRatio}) • Offset: {timelineOffset}s
          </div>
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
                {health?.ffmpeg_available ? 'ProRes 4444 Ready' : 'Unavailable'}
              </span>
            </div>
          </div>

          <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800">
            <span className="text-[10px] text-zinc-500 uppercase block">Hardware Device:</span>
            <div className="font-semibold text-zinc-200 mt-1 flex items-center space-x-1">
              <Cpu className="w-3.5 h-3.5 text-zinc-400" />
              <span>{health?.device?.toUpperCase() || 'CPU'}</span>
              {health?.gpu_available && (
                <span className="text-[10px] text-emerald-400 font-normal">
                  ({health.gpu_name || 'NVIDIA CUDA'})
                </span>
              )}
            </div>
          </div>

          <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800">
            <span className="text-[10px] text-zinc-500 uppercase block">Session Token:</span>
            <div className="font-semibold text-zinc-200 mt-1 flex items-center space-x-1">
              <Key className="w-3.5 h-3.5 text-zinc-400" />
              <span className="font-mono text-[11px] text-zinc-400">
                {EngineApiClient.getMaskedToken()}
              </span>
            </div>
          </div>
        </div>

        {/* Detailed Diagnostics JSON Viewer */}
        <div className="pt-2 border-t border-zinc-800/80">
          <button
            onClick={fetchDiagnostics}
            disabled={isLoadingDiag}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-medium transition"
          >
            <Activity className="w-3.5 h-3.5 text-blue-400" />
            <span>{isLoadingDiag ? 'Inspecting System...' : 'Inspect Complete System Diagnostics'}</span>
          </button>

          {diagnostics && (
            <pre className="mt-3 p-3 bg-zinc-950 rounded border border-zinc-800 text-[10px] font-mono text-zinc-400 overflow-x-auto max-h-60 leading-relaxed">
              {JSON.stringify(diagnostics, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
};
