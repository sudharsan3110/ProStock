import React, { useState } from 'react';
import { Signal } from '../../types';
import { RegimeBadge } from '../common/RegimeBadge';
import { ScoreBadge } from '../common/ScoreBadge';
import { FreshnessChip } from '../common/FreshnessChip';
import { PriceCell } from '../common/PriceCell';
import { useUI } from '../../context/UIContext';
import {
  X,
  Play,
  Bell,
  VolumeX,
  Share2,
  FileText,
  Sparkles,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  History,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

interface SignalDetailDrawerProps {
  signal: Signal | null;
  isOpen: boolean;
  onClose: () => void;
}

export const SignalDetailDrawer: React.FC<SignalDetailDrawerProps> = ({
  signal,
  isOpen,
  onClose
}) => {
  const { openOrderTicket, addToast } = useUI();
  const [showAiDetails, setShowAiDetails] = useState<boolean>(true);

  if (!isOpen || !signal) return null;

  const isLong = signal.direction === 'LONG';

  const handlePaperTrade = () => {
    openOrderTicket({
      symbol: signal.symbol,
      direction: signal.direction,
      price: signal.plan.currentPrice,
      stopLoss: signal.plan.stopLoss,
      targetPrice: signal.plan.target1,
      suggestedQty: signal.plan.suggestedQty
    });
    onClose();
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-bg-1 border-l border-border shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
      {/* 1. Header */}
      <div className="p-4 bg-bg-2/80 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg font-mono font-bold flex items-center gap-1.5 ${
            isLong ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
          }`}>
            {isLong ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
            <span>{signal.direction}</span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-fg-0">{signal.symbol}</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-bg-3 text-fg-2">{signal.timeframe}</span>
              <FreshnessChip state={signal.freshness} />
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                signal.mode === 'LIVE' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' : 'bg-purple-500/20 text-purple-400'
              }`}>
                {signal.mode}
              </span>
            </div>
            <div className="text-xs text-fg-2 flex items-center gap-2 mt-0.5">
              <span>{signal.strategy.name}</span>
              <span className="text-fg-3">({signal.strategy.version})</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <RegimeBadge regime={signal.regime} />
          <ScoreBadge score={signal.score.total} size="md" />
          <button
            onClick={onClose}
            className="p-1.5 text-fg-3 hover:text-fg-0 rounded-lg hover:bg-bg-hover transition-colors ml-2"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Drawer Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* 2. Trade Plan */}
        <section className="bg-bg-0/60 rounded-lg border border-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-fg-3">Trade Execution Plan</h4>
            <span className="text-xs font-mono text-emerald-400 font-semibold">R:R Ratio {signal.plan.riskReward}:1</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-2.5 rounded bg-bg-2 border border-border">
              <div className="text-[11px] text-fg-3 uppercase">Entry Zone</div>
              <div className="font-mono font-semibold text-fg-0 text-sm mt-0.5">
                ₹{signal.plan.entryMin} - ₹{signal.plan.entryMax}
              </div>
            </div>

            <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/20">
              <div className="text-[11px] text-rose-300 uppercase">Stop Loss</div>
              <div className="font-mono font-bold text-rose-400 text-sm mt-0.5">
                ₹{signal.plan.stopLoss.toFixed(2)}
              </div>
            </div>

            <div className="p-2.5 rounded bg-emerald-500/10 border border-emerald-500/20">
              <div className="text-[11px] text-emerald-300 uppercase">Target 1 (1.5R)</div>
              <div className="font-mono font-bold text-emerald-400 text-sm mt-0.5">
                ₹{signal.plan.target1.toFixed(2)}
              </div>
            </div>

            <div className="p-2.5 rounded bg-emerald-500/10 border border-emerald-500/20">
              <div className="text-[11px] text-emerald-300 uppercase">Target 2 (2.5R)</div>
              <div className="font-mono font-bold text-emerald-400 text-sm mt-0.5">
                ₹{signal.plan.target2.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs font-mono text-fg-2 pt-2 border-t border-border">
            <span>Suggested Size: <strong className="text-fg-0">{signal.plan.suggestedQty} Units</strong></span>
            <span>Est. Dollar Risk: <strong className="text-rose-400">₹{signal.plan.dollarRisk}</strong></span>
            <span>Heat Impact: <strong className="text-amber-400">+{signal.plan.heatImpactPercent}%</strong></span>
          </div>
        </section>

        {/* 3. Score Waterfall & Gates */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-fg-3">Score Factors & Gates</h4>
            <span className="text-xs font-mono text-fg-2">Factor Coverage: {signal.score.factorCoverage}%</span>
          </div>

          <div className="space-y-2">
            {signal.score.factors.map(f => (
              <div key={f.name} className="flex items-center justify-between text-xs font-mono">
                <span className="text-fg-2">{f.name}</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-1.5 bg-bg-3 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent rounded-full"
                      style={{ width: `${(f.score / f.max) * 100}%` }}
                    />
                  </div>
                  <span className="w-12 text-right font-medium text-fg-0">{f.score} / {f.max}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-1.5 pt-2">
            {signal.score.gatesPassed.map(gate => (
              <span key={gate} className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                <CheckCircle2 size={12} />
                {gate}
              </span>
            ))}
          </div>
        </section>

        {/* 4. Reasons List (Rule Verification) */}
        <section className="space-y-3">
          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-fg-3">Rules Verification</h4>
          <div className="space-y-2">
            {signal.reasons.map((r, i) => (
              <div key={i} className="p-3 rounded-lg bg-bg-2 border border-border space-y-1">
                <div className="flex items-center justify-between text-xs font-mono font-semibold">
                  <span className="text-fg-0">{r.rule}</span>
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 size={13} /> {r.value}
                  </span>
                </div>
                <div className="text-[11px] text-fg-2">{r.note}</div>
                <div className="text-[10px] font-mono text-fg-3">Threshold: {r.threshold}</div>
              </div>
            ))}
          </div>
        </section>

        {/* 5. Invalidation Criteria */}
        <section className="space-y-3">
          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-fg-3">Invalidation ("Void Setup If...")</h4>
          <div className="space-y-2">
            {signal.invalidation.map((inv, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 rounded bg-bg-2 border border-border text-xs">
                <span className="text-fg-1">{inv.condition}</span>
                <span className="font-mono text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30">
                  {inv.status}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* 6. Context & Data Quality */}
        <section className="p-3 rounded-lg bg-bg-2 border border-border space-y-2 text-xs">
          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-fg-3">Context & Feed Health</h4>
          <div className="grid grid-cols-2 gap-2 text-fg-2 font-mono">
            <div>Data Quality: <span className="text-fg-0">{signal.context.dataQualityScore}</span></div>
            <div>Volume Feed: <span className="text-fg-0">{signal.context.volumeSemantics}</span></div>
            <div className="col-span-2">Event Risk: <span className="text-fg-0">{signal.context.eventRisks}</span></div>
          </div>
        </section>

        {/* 7. Historical Evidence & Outcomes */}
        <section className="p-3 rounded-lg bg-bg-2 border border-border space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-fg-3">Historical Evidence (Regime Sliced)</h4>
            <span className="text-xs font-mono text-fg-3">{signal.evidence.sampleSize} Samples</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded bg-bg-0/60 border border-border">
              <div className="text-[10px] text-fg-3 uppercase">Win Rate</div>
              <div className="font-mono font-bold text-emerald-400 text-sm mt-0.5">{signal.evidence.historicalWinRate}%</div>
              <div className="text-[10px] text-fg-3 font-mono">{signal.evidence.confidenceInterval}</div>
            </div>
            <div className="p-2 rounded bg-bg-0/60 border border-border">
              <div className="text-[10px] text-fg-3 uppercase">Profit Factor</div>
              <div className="font-mono font-bold text-fg-0 text-sm mt-0.5">{signal.evidence.profitFactor}</div>
            </div>
            <div className="p-2 rounded bg-bg-0/60 border border-border">
              <div className="text-[10px] text-fg-3 uppercase">Sharpe Ratio</div>
              <div className="font-mono font-bold text-fg-0 text-sm mt-0.5">{signal.evidence.sharpeRatio}</div>
            </div>
          </div>
        </section>

        {/* 8. AI Rationale & Grounding */}
        <section className="p-3 rounded-lg bg-bg-2 border border-border space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-accent">
              <Sparkles size={14} />
              <span>AI Synthesized Rationale</span>
            </div>
            <span className="text-[10px] font-mono text-fg-3">Deterministic facts</span>
          </div>

          <p className="text-xs text-fg-1 leading-relaxed">{signal.aiExplanation.summary}</p>

          <ul className="space-y-1 pt-1 border-t border-border">
            {signal.aiExplanation.groundingFacts.map((fact, idx) => (
              <li key={idx} className="text-[11px] text-fg-2 flex items-start gap-1.5">
                <span className="text-accent mt-0.5">•</span>
                <span>{fact}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* 9. Actions Bar */}
      <div className="p-4 bg-bg-2 border-t border-border flex items-center justify-between gap-3">
        <button
          onClick={handlePaperTrade}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-accent hover:bg-accent-hover text-white font-semibold text-sm transition-all shadow-lg shadow-accent/25"
        >
          <Play size={16} fill="white" />
          <span>Execute Paper Trade</span>
        </button>

        <button
          onClick={() => addToast(`Alert created for ${signal.symbol} at ${signal.plan.target1}`, 'success')}
          className="p-2.5 rounded-lg bg-bg-3 hover:bg-bg-hover text-fg-1 border border-border transition-colors"
          title="Add Alert"
        >
          <Bell size={18} />
        </button>

        <button
          onClick={() => addToast(`Symbol ${signal.symbol} muted for 24h`, 'info')}
          className="p-2.5 rounded-lg bg-bg-3 hover:bg-bg-hover text-fg-1 border border-border transition-colors"
          title="Mute Symbol"
        >
          <VolumeX size={18} />
        </button>

        <button
          onClick={() => addToast('Signal link copied to clipboard', 'info')}
          className="p-2.5 rounded-lg bg-bg-3 hover:bg-bg-hover text-fg-1 border border-border transition-colors"
          title="Share Signal"
        >
          <Share2 size={18} />
        </button>
      </div>
    </div>
  );
};
