import React, { useState, useEffect } from 'react';
import { useMarket } from '../context/MarketContext';
import { marketApi } from '../api/marketApi';
import { Candle } from '../types';
import { InteractiveChart } from '../components/charts/InteractiveChart';
import { History, Play, Pause, SkipForward, RotateCcw, Clock } from 'lucide-react';

export const MarketReplayPage: React.FC = () => {
  const { activeSymbol } = useMarket();
  const [allCandles, setAllCandles] = useState<Candle[]>([]);
  const [visibleCount, setVisibleCount] = useState<number>(30);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1);

  useEffect(() => {
    marketApi.getCandles(activeSymbol).then(c => {
      setAllCandles(c);
      setVisibleCount(Math.min(30, c.length));
    }).catch(console.error);
  }, [activeSymbol]);

  useEffect(() => {
    let timer: any;
    if (isPlaying) {
      timer = setInterval(() => {
        setVisibleCount(prev => {
          if (prev >= allCandles.length) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000 / speed);
    }
    return () => clearInterval(timer);
  }, [isPlaying, speed, allCandles.length]);

  const currentCandles = allCandles.slice(0, visibleCount);
  const currentBar = currentCandles[currentCandles.length - 1];

  return (
    <div className="p-4 space-y-4 max-w-[1920px] mx-auto select-none">
      {/* Replay Controls Strip */}
      <div className="pro-card p-4 flex flex-wrap items-center justify-between gap-4 font-mono">
        <div className="flex items-center gap-3">
          <History size={20} className="text-accent" />
          <div>
            <h2 className="text-base font-bold text-fg-0 font-sans">Market Replay Time Machine</h2>
            <p className="text-xs text-fg-3 font-sans">Scrub historical days bar-by-bar to audit deterministic signal generation</p>
          </div>
        </div>

        {/* Player Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setVisibleCount(30)}
            className="p-2 rounded bg-bg-2 hover:bg-bg-hover text-fg-2 border border-border"
            title="Reset"
          >
            <RotateCcw size={15} />
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white font-bold text-xs shadow-lg shadow-accent/25 transition-all"
          >
            {isPlaying ? <Pause size={15} /> : <Play size={15} fill="white" />}
            <span>{isPlaying ? 'Pause' : 'Play Replay'}</span>
          </button>

          <button
            onClick={() => setVisibleCount(prev => Math.min(allCandles.length, prev + 1))}
            className="p-2 rounded bg-bg-2 hover:bg-bg-hover text-fg-2 border border-border"
            title="Step 1 Bar"
          >
            <SkipForward size={15} />
          </button>

          {/* Speed Selector */}
          <div className="flex items-center bg-bg-2 rounded border border-border text-xs p-0.5 ml-2">
            {[1, 2, 5, 10].map(s => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-2 py-1 rounded font-bold ${
                  speed === s ? 'bg-accent text-white' : 'text-fg-3 hover:text-fg-0'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Progress & Current Timestamp Bar */}
      <div className="pro-card p-3 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2 text-fg-2">
          <Clock size={14} className="text-accent" />
          <span>Simulated Time: <strong className="text-fg-0">{currentBar ? new Date(currentBar.time).toLocaleString() : 'Loading...'}</strong></span>
        </div>
        <div className="text-fg-3">
          Bar <strong className="text-fg-0">{visibleCount}</strong> of {allCandles.length}
        </div>
      </div>

      {/* Chart */}
      <InteractiveChart
        symbol={activeSymbol}
        candles={currentCandles}
        height={520}
      />
    </div>
  );
};
