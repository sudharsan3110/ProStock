import React, { useState } from 'react';
import { useMarket } from '../context/MarketContext';
import { useLiveCandles } from '../hooks/useLiveCandles';
import { InteractiveChart } from '../components/charts/InteractiveChart';
import { LineChart, LayoutGrid, Square, Columns } from 'lucide-react';

/** One chart pane with its own data subscription and timeframe. */
const StudioChart: React.FC<{ symbol: string; height: number }> = ({ symbol, height }) => {
  const { tickers } = useMarket();
  const ticker = tickers.find(t => t.symbol === symbol);
  const [timeframe, setTimeframe] = useState('15m');
  const candles = useLiveCandles(symbol, timeframe, ticker?.market === 'CRYPTO');

  return (
    <InteractiveChart
      symbol={symbol}
      candles={candles}
      timeframe={timeframe}
      onTimeframeChange={setTimeframe}
      freshness={ticker?.freshness}
      height={height}
    />
  );
};

export const ChartStudioPage: React.FC = () => {
  const { activeSymbol } = useMarket();
  const [layout, setLayout] = useState<'1x1' | '1x2' | '2x2'>('1x1');

  // Companion panes: benchmark plus the two largest crypto pairs, skipping the active symbol.
  const companions = ['NIFTY 50', 'BTCUSDT', 'ETHUSDT', 'SOLUSDT'].filter(s => s !== activeSymbol);

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
        <StudioChart symbol={activeSymbol} height={layout === '1x1' ? 620 : 420} />
        {layout !== '1x1' && <StudioChart symbol={companions[0]} height={420} />}
        {layout === '2x2' && (
          <>
            <StudioChart symbol={companions[1]} height={420} />
            <StudioChart symbol={companions[2]} height={420} />
          </>
        )}
      </div>
    </div>
  );
};
