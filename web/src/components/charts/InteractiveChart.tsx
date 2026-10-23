import React, { useRef, useEffect, useState } from 'react';
import { Candle, FreshnessState, Signal } from '../../types';
import { PriceCell } from '../common/PriceCell';
import { Delta } from '../common/Delta';
import { FreshnessChip } from '../common/FreshnessChip';
import { Maximize2, RefreshCw, Layers, TrendingUp } from 'lucide-react';

interface InteractiveChartProps {
  symbol: string;
  candles: Candle[];
  signal?: Signal | null;
  onTimeframeChange?: (tf: string) => void;
  /** Controlled timeframe; when omitted the chart tracks its own selection. */
  timeframe?: string;
  freshness?: FreshnessState;
  height?: number;
}

export const InteractiveChart: React.FC<InteractiveChartProps> = ({
  symbol,
  candles,
  signal,
  onTimeframeChange,
  timeframe,
  freshness = 'LIVE',
  height = 480
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [internalTf, setSelectedTf] = useState<string>('15m');
  const selectedTf = timeframe ?? internalTf;
  const [showVwap, setShowVwap] = useState<boolean>(true);
  const [showEma, setShowEma] = useState<boolean>(true);
  const [hoveredCandle, setHoveredCandle] = useState<Candle | null>(null);
  const [crosshairPos, setCrosshairPos] = useState<{ x: number; y: number } | null>(null);

  const timeframes = ['1m', '5m', '15m', '1h', '4h', '1D'];

  const lastCandle = candles.length > 0 ? candles[candles.length - 1] : null;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || candles.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const canvasHeight = rect.height;

    // Dimensions
    const paddingRight = 65; // Price scale
    const paddingBottom = 26; // Time scale
    const paddingTop = 15;
    const chartWidth = width - paddingRight;
    const chartHeight = canvasHeight - paddingBottom - paddingTop;
    const volumeHeight = chartHeight * 0.22;
    const priceHeight = chartHeight - volumeHeight - 10;

    ctx.clearRect(0, 0, width, canvasHeight);

    // Find min and max price
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    let maxVolume = 0;

    candles.forEach(c => {
      if (c.low < minPrice) minPrice = c.low;
      if (c.high > maxPrice) maxPrice = c.high;
      if (c.volume > maxVolume) maxVolume = c.volume;
    });

    if (signal?.plan) {
      minPrice = Math.min(minPrice, signal.plan.stopLoss * 0.998);
      maxPrice = Math.max(maxPrice, signal.plan.target2 * 1.002);
    }

    const priceRange = maxPrice - minPrice || 1;
    const paddingPrice = priceRange * 0.05;
    const effectiveMin = minPrice - paddingPrice;
    const effectiveMax = maxPrice + paddingPrice;
    const effectiveRange = effectiveMax - effectiveMin;

    const getY = (price: number) => {
      return paddingTop + priceHeight - ((price - effectiveMin) / effectiveRange) * priceHeight;
    };

    // Draw grid lines
    ctx.strokeStyle = '#1e2330';
    ctx.lineWidth = 1;
    const gridSteps = 6;
    ctx.fillStyle = '#6b7280';
    ctx.font = '11px JetBrains Mono';
    ctx.textAlign = 'left';

    for (let i = 0; i <= gridSteps; i++) {
      const p = effectiveMin + (effectiveRange / gridSteps) * i;
      const y = getY(p);

      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartWidth, y);
      ctx.stroke();

      // Price labels on right
      ctx.fillText(p.toFixed(2), chartWidth + 6, y + 4);
    }

    // Candle bar width
    const barWidth = Math.max(2, Math.floor((chartWidth / candles.length) * 0.72));
    const step = chartWidth / candles.length;

    // Draw Volume Bars
    candles.forEach((c, idx) => {
      const x = idx * step + step / 2;
      const vHeight = (c.volume / (maxVolume || 1)) * volumeHeight;
      const vY = canvasHeight - paddingBottom - vHeight;
      const isUp = c.close >= c.open;

      ctx.fillStyle = isUp ? 'rgba(16, 185, 129, 0.22)' : 'rgba(239, 68, 68, 0.22)';
      ctx.fillRect(x - barWidth / 2, vY, barWidth, vHeight);
    });

    // Draw Signal Entry, Stop Loss & Targets
    if (signal?.plan) {
      const entryY1 = getY(signal.plan.entryMin);
      const entryY2 = getY(signal.plan.entryMax);
      const slY = getY(signal.plan.stopLoss);
      const tp1Y = getY(signal.plan.target1);
      const tp2Y = getY(signal.plan.target2);

      // Entry Zone
      ctx.fillStyle = 'rgba(59, 130, 246, 0.12)';
      ctx.fillRect(0, Math.min(entryY1, entryY2), chartWidth, Math.abs(entryY1 - entryY2) || 4);

      // Stop Loss Line
      ctx.strokeStyle = '#ef4444';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, slY);
      ctx.lineTo(chartWidth, slY);
      ctx.stroke();
      ctx.fillStyle = '#ef4444';
      ctx.fillText(`SL ${signal.plan.stopLoss.toFixed(1)}`, chartWidth - 80, slY - 4);

      // TP1 Line
      ctx.strokeStyle = '#10b981';
      ctx.beginPath();
      ctx.moveTo(0, tp1Y);
      ctx.lineTo(chartWidth, tp1Y);
      ctx.stroke();
      ctx.fillStyle = '#10b981';
      ctx.fillText(`TP1 ${signal.plan.target1.toFixed(1)}`, chartWidth - 80, tp1Y - 4);

      // TP2 Line
      if (signal.plan.target2) {
        ctx.beginPath();
        ctx.moveTo(0, tp2Y);
        ctx.lineTo(chartWidth, tp2Y);
        ctx.stroke();
        ctx.fillText(`TP2 ${signal.plan.target2.toFixed(1)}`, chartWidth - 80, tp2Y - 4);
      }

      ctx.setLineDash([]);
    }

    // Draw Candlesticks
    candles.forEach((c, idx) => {
      const x = idx * step + step / 2;
      const openY = getY(c.open);
      const closeY = getY(c.close);
      const highY = getY(c.high);
      const lowY = getY(c.low);
      const isUp = c.close >= c.open;

      const candleColor = isUp ? '#10b981' : '#ef4444';
      ctx.strokeStyle = candleColor;
      ctx.fillStyle = candleColor;

      // Wick
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      // Body
      const top = Math.min(openY, closeY);
      const bodyH = Math.max(1.5, Math.abs(openY - closeY));
      ctx.fillRect(x - barWidth / 2, top, barWidth, bodyH);
    });

    // Draw VWAP line
    if (showVwap) {
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      candles.forEach((c, idx) => {
        const val = c.vwap !== undefined ? c.vwap : c.close;
        const x = idx * step + step / 2;
        const y = getY(val);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    // Draw EMA(20) line
    if (showEma && candles.length >= 5) {
      const k = 2 / (20 + 1);
      const ema: number[] = [];
      candles.forEach((c, i) => {
        if (i < 19) {
          ema.push(NaN);
        } else if (i === 19) {
          const sum = candles.slice(0, 20).reduce((acc, curr) => acc + curr.close, 0);
          ema.push(sum / 20);
        } else {
          ema.push(c.close * k + ema[i - 1] * (1 - k));
        }
      });

      ctx.strokeStyle = '#a78bfa';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      let started = false;
      candles.forEach((_, idx) => {
        const val = ema[idx];
        if (isNaN(val)) return;
        const x = idx * step + step / 2;
        const y = getY(val);
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
    }

    // Draw Crosshair
    if (crosshairPos) {
      ctx.strokeStyle = '#4b5563';
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1;

      // Vertical line
      ctx.beginPath();
      ctx.moveTo(crosshairPos.x, 0);
      ctx.lineTo(crosshairPos.x, canvasHeight - paddingBottom);
      ctx.stroke();

      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(0, crosshairPos.y);
      ctx.lineTo(chartWidth, crosshairPos.y);
      ctx.stroke();

      ctx.setLineDash([]);
    }
  }, [candles, signal, showVwap, showEma, crosshairPos]);

  // Window resize observer to prevent DPI blur
  const [, setDimensions] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas?.parentElement) return;

    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setDimensions({
          w: entry.contentRect.width,
          h: entry.contentRect.height
        });
      }
    });

    observer.observe(canvas.parentElement);
    return () => observer.disconnect();
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || candles.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCrosshairPos({ x, y });

    const step = (rect.width - 65) / candles.length;
    const index = Math.min(candles.length - 1, Math.max(0, Math.floor(x / step)));
    setHoveredCandle(candles[index]);
  };

  const handleMouseLeave = () => {
    setCrosshairPos(null);
    setHoveredCandle(null);
  };

  const displayCandle = hoveredCandle || lastCandle;

  return (
    <div className="pro-card flex flex-col overflow-hidden bg-bg-1 border border-border">
      {/* Chart Top Header & Controls */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-bg-2/50 border-b border-border gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-base tracking-wide text-fg-0">{symbol}</span>
            <FreshnessChip state={freshness} />
          </div>

          {displayCandle && (
            <div className="flex items-center gap-3 text-xs font-mono text-fg-2">
              <span>O: <span className="text-fg-0 font-medium">{displayCandle.open.toFixed(2)}</span></span>
              <span>H: <span className="text-emerald-400 font-medium">{displayCandle.high.toFixed(2)}</span></span>
              <span>L: <span className="text-rose-400 font-medium">{displayCandle.low.toFixed(2)}</span></span>
              <span>C: <span className="text-fg-0 font-medium">{displayCandle.close.toFixed(2)}</span></span>
              <span>Vol: <span className="text-fg-1">{displayCandle.volume.toLocaleString()}</span></span>
            </div>
          )}
        </div>

        {/* Action and Timeframe bar */}
        <div className="flex items-center gap-2">
          {/* Timeframe buttons */}
          <div className="flex items-center bg-bg-3 rounded p-0.5 border border-border-light">
            {timeframes.map(tf => (
              <button
                key={tf}
                onClick={() => {
                  setSelectedTf(tf);
                  if (onTimeframeChange) onTimeframeChange(tf);
                }}
                className={`px-2 py-0.5 text-xs font-mono rounded transition-colors ${
                  selectedTf === tf
                    ? 'bg-accent text-white font-semibold'
                    : 'text-fg-2 hover:text-fg-0 hover:bg-bg-hover'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Indicators toggles */}
          <button
            onClick={() => setShowVwap(!showVwap)}
            className={`px-2 py-1 text-xs font-mono rounded border transition-colors ${
              showVwap ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/40' : 'bg-bg-2 text-fg-3 border-border hover:text-fg-1'
            }`}
          >
            VWAP
          </button>
          <button
            onClick={() => setShowEma(!showEma)}
            className={`px-2 py-1 text-xs font-mono rounded border transition-colors ${
              showEma ? 'bg-purple-500/15 text-purple-400 border-purple-500/40' : 'bg-bg-2 text-fg-3 border-border hover:text-fg-1'
            }`}
          >
            EMA 20
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="relative w-full" style={{ height: `${height}px` }}>
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="w-full h-full cursor-crosshair block"
        />
      </div>
    </div>
  );
};
