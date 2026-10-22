import React from 'react';
import { BookOpen, Sparkles, CheckCircle2, AlertTriangle, Tag } from 'lucide-react';

export const TradeJournalPage: React.FC = () => {
  const journalEntries = [
    {
      id: "JRN-01",
      symbol: "RELIANCE",
      direction: "LONG",
      entryPrice: 2718.50,
      exitPrice: 2778.00,
      pnl: 4462.50,
      rMultiple: "+2.45R",
      followedPlan: true,
      tags: ["EMA Pullback", "Followed Plan", "Full Target"],
      emotion: "Disciplined",
      aiPostMortem: "Flawless execution. Entry executed precisely within 15m dynamic EMA 20 retest zone. Position trailed according to plan until T1 reached.",
      date: "2026-10-20"
    },
    {
      id: "JRN-02",
      symbol: "TATAMOTORS",
      direction: "LONG",
      entryPrice: 916.20,
      exitPrice: 932.70,
      pnl: 2475.00,
      rMultiple: "+1.84R",
      followedPlan: true,
      tags: ["Liquidity Sweep", "FVG Retest"],
      emotion: "Calm",
      aiPostMortem: "Strong momentum breakout confirmed with 1.48x RVOL. Trailing stop currently moved to breakeven at 916.20.",
      date: "2026-10-20"
    },
    {
      id: "JRN-03",
      symbol: "SBIN",
      direction: "LONG",
      entryPrice: 814.00,
      exitPrice: 806.00,
      pnl: -1200.00,
      rMultiple: "-1.00R",
      followedPlan: true,
      tags: ["Stop Loss Hit", "Disciplined Loss"],
      emotion: "Neutral",
      aiPostMortem: "Standard statistical stop out following range breakdown. Risk capped strictly at 1% of equity. Zero rule deviations.",
      date: "2026-10-18"
    }
  ];

  return (
    <div className="p-4 space-y-4 max-w-[1920px] mx-auto select-none">
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <BookOpen size={20} className="text-accent" />
        <div>
          <h2 className="text-base font-bold text-fg-0">Quantitative Trade Journal & Post-Mortem</h2>
          <p className="text-xs text-fg-3">Execution review, rule compliance tracking, and AI retrospective analysis</p>
        </div>
      </div>

      <div className="space-y-4">
        {journalEntries.map(entry => {
          const isWin = entry.pnl >= 0;
          return (
            <div key={entry.id} className="pro-card p-5 space-y-3 font-mono">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-base text-fg-0 font-sans">{entry.symbol}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    entry.direction === 'LONG' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                  }`}>
                    {entry.direction}
                  </span>
                  <span className="text-xs text-fg-3">{entry.date}</span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-fg-2">
                    Entry: ₹{entry.entryPrice} → Exit: ₹{entry.exitPrice}
                  </span>
                  <span className={`text-sm font-bold ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {entry.rMultiple} ({isWin ? '+' : ''}₹{entry.pnl.toFixed(2)})
                  </span>
                </div>
              </div>

              {/* Tags & Emotion */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {entry.tags.map(t => (
                  <span key={t} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-bg-2 text-fg-2 border border-border text-[11px]">
                    <Tag size={10} />
                    {t}
                  </span>
                ))}
                <span className="text-fg-3 text-[11px]">Emotion State: <strong className="text-fg-1">{entry.emotion}</strong></span>
              </div>

              {/* AI Post-Mortem */}
              <div className="p-3 bg-bg-0/60 rounded-lg border border-border flex items-start gap-2 text-xs">
                <Sparkles size={16} className="text-accent flex-shrink-0 mt-0.5" />
                <p className="text-fg-1 leading-relaxed">{entry.aiPostMortem}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
