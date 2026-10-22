import React, { useState, useEffect } from 'react';
import { analyticsApi } from '../api/analyticsApi';
import { SystemHealth } from '../types';
import { Activity, Database, Cpu, Wifi, Server, CheckCircle2 } from 'lucide-react';

export const SystemHealthPage: React.FC = () => {
  const [health, setHealth] = useState<SystemHealth | null>(null);

  useEffect(() => {
    analyticsApi.getSystemHealth().then(setHealth).catch(console.error);
  }, []);

  if (!health) return null;

  return (
    <div className="p-4 space-y-4 max-w-[1920px] mx-auto select-none">
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <Activity size={20} className="text-accent" />
        <div>
          <h2 className="text-base font-bold text-fg-0">System Telemetry & Watchdog</h2>
          <p className="text-xs text-fg-3">Real-time health of market feed ingestion, SignalR hubs, and database pipelines</p>
        </div>
      </div>

      {/* Primary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
        <div className="pro-card p-4">
          <span className="text-[10px] text-fg-3 uppercase block">Engine Status</span>
          <span className="text-xl font-bold text-emerald-400 mt-1 block flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 pulse-led" />
            {health.status}
          </span>
          <span className="text-[10px] text-fg-3">Uptime: {health.uptime}</span>
        </div>

        <div className="pro-card p-4">
          <span className="text-[10px] text-fg-3 uppercase block">Pipeline Latency</span>
          <span className="text-xl font-bold text-fg-0 mt-1 block">
            {health.pipeline.signalEvaluationTimeMs} ms
          </span>
          <span className="text-[10px] text-fg-3">Bar Close → Signal Persisted</span>
        </div>

        <div className="pro-card p-4">
          <span className="text-[10px] text-fg-3 uppercase block">DB Write Latency</span>
          <span className="text-xl font-bold text-fg-0 mt-1 block">
            {health.pipeline.dbWriteLatencyMs} ms
          </span>
          <span className="text-[10px] text-fg-3">Hot Dapper / TimescaleDB</span>
        </div>

        <div className="pro-card p-4">
          <span className="text-[10px] text-fg-3 uppercase block">Memory / Storage</span>
          <span className="text-xl font-bold text-fg-0 mt-1 block">
            {health.infrastructure.ramUsage}
          </span>
          <span className="text-[10px] text-fg-3">CPU: {health.infrastructure.cpuLoad}</span>
        </div>
      </div>

      {/* Provider Connectivity Table */}
      <div className="pro-card overflow-hidden">
        <div className="pro-card-header">
          <h3 className="font-bold text-sm text-fg-0">Market Data Providers</h3>
          <span className="text-xs font-mono text-emerald-400">All 3 Feeds Streaming</span>
        </div>

        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-bg-2 text-fg-3 uppercase text-[11px] border-b border-border">
            <tr>
              <th className="py-2.5 px-4">Provider / Exchange</th>
              <th className="py-2.5 px-4">Status</th>
              <th className="py-2.5 px-4">Roundtrip Latency</th>
              <th className="py-2.5 px-4">Last Tick Age</th>
              <th className="py-2.5 px-4">Dropped Ticks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {health.providers.map(p => (
              <tr key={p.name} className="hover:bg-bg-hover/50">
                <td className="py-3 px-4 font-bold text-fg-0">{p.name}</td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/30 text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-led" />
                    {p.status}
                  </span>
                </td>
                <td className="py-3 px-4 text-fg-0 font-semibold">{p.latencyMs} ms</td>
                <td className="py-3 px-4 text-fg-2">{p.lastTickAgeSec}s ago</td>
                <td className="py-3 px-4 text-emerald-400 font-bold">{p.droppedTicks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Architecture & Watchdog Summary */}
      <div className="pro-card p-4 space-y-3 font-mono text-xs">
        <div className="flex items-center gap-2 text-fg-0 font-bold">
          <Server size={16} className="text-accent" />
          <span>Database & Microservice Architecture</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-fg-2">
          <div className="p-3 bg-bg-2 rounded border border-border space-y-1">
            <span className="text-[11px] text-fg-3 uppercase block">Primary Database Configuration</span>
            <div className="text-fg-0 font-bold">{health.infrastructure.activeDatabase}</div>
            <div className="text-fg-3 text-[11px] mt-1">Chunk compression ratio: 8.2x</div>
          </div>

          <div className="p-3 bg-bg-2 rounded border border-border space-y-1">
            <span className="text-[11px] text-fg-3 uppercase block">Dead-Man's Watchdog</span>
            <div className="text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle2 size={14} />
              Watchdog Heartbeat: {health.pipeline.watchdogHeartbeat}
            </div>
            <div className="text-fg-3 text-[11px] mt-1">External alert webhook configured (Telegram/Discord)</div>
          </div>
        </div>
      </div>
    </div>
  );
};
