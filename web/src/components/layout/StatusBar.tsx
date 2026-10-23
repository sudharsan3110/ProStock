import React, { useEffect, useState } from 'react';
import { useUI } from '../../context/UIContext';
import { analyticsApi } from '../../api/analyticsApi';
import { HubState, signalRManager } from '../../api/signalr';
import { SystemHealth } from '../../types';
import { AlertOctagon, Wifi, WifiOff } from 'lucide-react';

const LED: Record<string, string> = {
  CONNECTED: 'bg-emerald-400 pulse-led',
  RECONNECTING: 'bg-amber-400',
  DISCONNECTED: 'bg-gray-500'
};

export const StatusBar: React.FC = () => {
  const { isKillSwitchModalOpen, setIsKillSwitchModalOpen, addToast } = useUI();
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [hubState, setHubState] = useState<HubState>('DISCONNECTED');

  useEffect(() => {
    const load = () => analyticsApi.getSystemHealth().then(setHealth).catch(() => setHealth(null));
    load();
    const interval = setInterval(load, 5000);
    const unsubscribe = signalRManager.subscribeState(setHubState);
    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  const binance = health?.providers.find(p => p.name.startsWith('Binance'));

  return (
    <>
      <footer className="h-7 bg-bg-2 border-t border-border px-3 flex items-center justify-between text-[11px] font-mono select-none z-20">
        {/* Left: Provider LEDs (live from /api/v1/health) */}
        <div className="flex items-center gap-4 text-fg-2">
          {!health && (
            <div className="flex items-center gap-1.5 text-rose-400">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>Backend unreachable</span>
            </div>
          )}
          {health?.providers.map(p => (
            <div key={p.name} className="flex items-center gap-1.5" title={p.lastError ?? `${p.name}: ${p.status}`}>
              <span className={`w-2 h-2 rounded-full ${LED[p.status] ?? LED.DISCONNECTED}`} />
              <span className={p.status === 'CONNECTED' ? 'text-fg-1' : 'text-fg-3'}>{p.name.split(' ')[0]}</span>
              <span className="text-[10px] text-fg-3">
                {p.status === 'CONNECTED' ? `${p.latencyMs}ms` : p.status === 'RECONNECTING' ? 'retrying' : 'off'}
              </span>
            </div>
          ))}

          <div className="hidden md:flex items-center gap-1 text-fg-3 border-l border-border pl-3">
            {hubState === 'CONNECTED'
              ? <Wifi size={12} className="text-emerald-400" />
              : <WifiOff size={12} className={hubState === 'DISCONNECTED' ? 'text-rose-400' : 'text-amber-400'} />}
            <span>SignalR: {hubState.toLowerCase()}</span>
          </div>
        </div>

        {/* Right: Telemetry & Kill Switch */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-3 text-fg-3">
            {binance && binance.lastTickAgeSec >= 0 && (
              <span>
                Tick Lag:{' '}
                <strong className={binance.lastTickAgeSec < 5 ? 'text-emerald-400' : 'text-amber-400'}>
                  {binance.lastTickAgeSec}s
                </strong>
              </span>
            )}
            {health && <span>RAM: <strong className="text-fg-2">{health.infrastructure.ramUsage}</strong></span>}
          </div>

          {/* Kill Switch Button */}
          <button
            onClick={() => setIsKillSwitchModalOpen(true)}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/40 text-[10px] font-bold tracking-wider uppercase transition-colors"
          >
            <AlertOctagon size={11} />
            <span>KILL SWITCH</span>
          </button>
        </div>
      </footer>

      {/* Kill Switch Confirmation Modal */}
      {isKillSwitchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-bg-1 border border-rose-500/50 rounded-xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-rose-500 font-bold text-base">
              <AlertOctagon size={22} />
              <span>ENGAGE KILL SWITCH</span>
            </div>
            <p className="text-xs text-fg-2 leading-relaxed">
              This emergency circuit breaker will immediately cancel all pending paper and broker orders, liquidate active open positions, and suspend real-time signal generation.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setIsKillSwitchModalOpen(false)}
                className="flex-1 py-2 rounded bg-bg-2 hover:bg-bg-hover text-fg-1 text-xs font-semibold"
              >
                Dismiss
              </button>
              <button
                onClick={() => {
                  setIsKillSwitchModalOpen(false);
                  addToast('KILL SWITCH ACTIVATED: All trades flattened, signals halted.', 'error');
                }}
                className="flex-1 py-2 rounded bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-lg shadow-rose-600/30"
              >
                CONFIRM FLATTEN
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
