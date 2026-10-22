import React, { useState, useEffect } from 'react';
import { analyticsApi } from '../api/analyticsApi';
import { NewsItem } from '../types';
import { Newspaper, Sparkles, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export const NewsPage: React.FC = () => {
  const [news, setNews] = useState<NewsItem[]>([]);

  useEffect(() => {
    analyticsApi.getNews().then(setNews).catch(console.error);
  }, []);

  return (
    <div className="p-4 space-y-4 max-w-[1920px] mx-auto select-none">
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <Newspaper size={20} className="text-accent" />
        <div>
          <h2 className="text-base font-bold text-fg-0">News & Sentiment Intelligence</h2>
          <p className="text-xs text-fg-3">Clustered financial news feed with sentiment attribution and AI summaries</p>
        </div>
      </div>

      <div className="space-y-3">
        {news.map(item => {
          const isBull = item.sentiment === 'BULLISH';
          const isBear = item.sentiment === 'BEARISH';
          return (
            <div key={item.id} className="pro-card p-4 space-y-2.5 hover:border-border-light transition-colors">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 ${
                    isBull
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : isBear
                      ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  }`}>
                    {isBull ? <TrendingUp size={11} /> : isBear ? <TrendingDown size={11} /> : <Minus size={11} />}
                    {item.sentiment} ({Math.round(item.score * 100)}%)
                  </span>

                  <span className="text-xs text-fg-3 font-mono">{item.source}</span>
                  <span className="text-xs text-fg-3 font-mono">
                    • {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 font-mono text-xs">
                  {item.symbols.map(s => (
                    <span key={s} className="px-2 py-0.5 rounded bg-bg-2 text-fg-1 border border-border font-bold">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <h3 className="font-bold text-sm text-fg-0 leading-snug">{item.headline}</h3>

              <div className="p-3 bg-bg-0/60 rounded border border-border flex items-start gap-2 text-xs">
                <Sparkles size={14} className="text-accent flex-shrink-0 mt-0.5" />
                <p className="text-fg-2 leading-relaxed">{item.aiSummary}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
