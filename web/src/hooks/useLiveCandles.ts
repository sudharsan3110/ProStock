import { useEffect, useState } from 'react';
import { marketApi } from '../api/marketApi';
import { signalRManager } from '../api/signalr';
import { Candle } from '../types';

const MAX_BARS = 120;
/** The backend streams 15m klines; other intervals are refreshed from REST on this cadence. */
const POLL_MS = 10_000;
const STREAMED_TIMEFRAME = '15m';

/**
 * Candles for a chart. Streamed crypto symbols update in place as CandleUpdate events
 * arrive (the forming bar ticks, closed bars append); other timeframes poll REST.
 */
export function useLiveCandles(symbol: string, timeframe: string = '15m', live: boolean = true) {
  const [candles, setCandles] = useState<Candle[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      marketApi.getCandles(symbol, timeframe)
        .then(c => { if (!cancelled) setCandles(c); })
        .catch(console.error);

    setCandles([]);
    load();

    if (!live) return () => { cancelled = true; };

    const unsubscribe = timeframe === STREAMED_TIMEFRAME
      ? signalRManager.subscribeCandles(update => {
          if (update.symbol !== symbol || update.timeframe !== timeframe) return;
          setCandles(prev => {
            if (prev.length === 0) return prev;
            const last = prev[prev.length - 1];
            if (last.time === update.candle.time) {
              return [...prev.slice(0, -1), update.candle];
            }
            if (Date.parse(update.candle.time) > Date.parse(last.time)) {
              return [...prev, update.candle].slice(-MAX_BARS);
            }
            return prev;
          });
        })
      : null;

    const poll = unsubscribe ? null : setInterval(load, POLL_MS);

    return () => {
      cancelled = true;
      unsubscribe?.();
      if (poll) clearInterval(poll);
    };
  }, [symbol, timeframe, live]);

  return candles;
}
