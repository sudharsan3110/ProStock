import React, { useState, useEffect } from 'react';
import { useMarket } from '../context/MarketContext';
import { marketApi } from '../api/marketApi';
import { Candle } from '../types';
import { InteractiveChart } from '../components/charts/InteractiveChart';
import { LineChart, LayoutGrid, Square, Columns } from 'lucide-react';

export const ChartStudioPage: React.FC = () => {
  const { activeSymbol, tickers, setActiveSymbol } = useMarket();
  const [candles, setCandles] = useState<Candle[]>([]);
  const [layout, setLayout] = useState<'1x1' | '1x2' | '2x2'>('1x1');

  useEffect(() => {
    marketApi.getCandles(activeSymbol).then(setCandles).catch(console.error);
  }, [activeSymbol]);

  return (
    <div className="p-4 space-y-4 max-w-[1920px] mx-auto select-none">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <LineChart size={20} className="text-accent" />
          <div>
            <h2 className="text-base font-bold text-fg-0">Multi-Chart Studio</h2>
            <p className="text-xs text-fg-3">Synchronized crosshairs, multi-timeframe correlation, and custom drawing templates</p>
          </div>
        </div>

        {/* Layout Switcher */}
        <div className="flex items-center gap-1 bg-bg-2 p-1 rounded-lg border border-border">
          <button
            onClick={() => setLayout('1x1')}
            className={`p-1.5 rounded ${layout === '1x1' ? 'bg-accent text-white' : 'text-fg-3 hover:text-fg-0'}`}
            title="Single Chart"
          >
            <Square size={16} />
          </button>
          <button
            onClick={() => setLayout('1x2')}
            className={`p-1.5 rounded ${layout === '1x2' ? 'bg-accent text-white' : 'text-fg-3 hover:text-fg-0'}`}
            title="Two Charts"
          >
            <Columns size={16} />
          </button>
          <button
            onClick={() => setLayout('2x2')}
            className={`p-1.5 rounded ${layout === '2x2' ? 'bg-accent text-white' : 'text-fg-3 hover:text-fg-0'}`}
            title="Four Grid"
          >
            <LayoutGrid size={16} />
          </button>
        </div>
      </div>

      {/* Grid of charts */}
      <div className={`grid gap-4 ${
        layout === '1x1' ? 'grid-cols-1' : layout === '1x2' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2'
      }`}>
        <InteractiveChart symbol={activeSymbol} candles={candles} height={layout === '1x1' ? 620 : 420} />
        {layout !== '1x1' && (
          <InteractiveChart symbol="NIFTY 50" candles={candles} height={420} />
        )}
        {layout === '2x2' && (
          <>
            <InteractiveChart symbol="NVDA" candles={candles} height={420} />
            <InteractiveChart symbol="BTCUSDT" candles={candles} height={420} />
          </>
        )}
      </div>
    </div>
  );
};
