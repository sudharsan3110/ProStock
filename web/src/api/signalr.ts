import * as signalR from '@microsoft/signalr';
import { Candle, Signal, Ticker } from '../types';

const HUB_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL
  ? (import.meta as any).env.VITE_API_BASE_URL.replace('/api/v1', '')
  : 'http://localhost:5000';

export type HubState = 'CONNECTING' | 'CONNECTED' | 'RECONNECTING' | 'DISCONNECTED';

export interface CandleUpdate {
  symbol: string;
  timeframe: string;
  closed: boolean;
  candle: Candle;
}

type Listener<T> = (payload: T) => void;

/**
 * One shared connection per hub; any number of components subscribe to its events.
 * Each subscribe* call returns an unsubscribe function for use in effect cleanups.
 */
class SignalRManager {
  private marketConnection: signalR.HubConnection | null = null;
  private signalConnection: signalR.HubConnection | null = null;

  private tickListeners = new Set<Listener<Partial<Ticker> & { symbol: string }>>();
  private candleListeners = new Set<Listener<CandleUpdate>>();
  private signalListeners = new Set<Listener<Signal>>();
  private stateListeners = new Set<Listener<HubState>>();
  private marketState: HubState = 'DISCONNECTED';

  private setMarketState(state: HubState) {
    this.marketState = state;
    this.stateListeners.forEach(l => l(state));
  }

  private build(path: string) {
    return new signalR.HubConnectionBuilder()
      .withUrl(`${HUB_BASE_URL}${path}`, {
        accessTokenFactory: () => localStorage.getItem('prostock_token') || ''
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();
  }

  private ensureMarketHub() {
    if (this.marketConnection) return;

    const conn = this.build('/hubs/market');
    conn.on('TickUpdate', tick => this.tickListeners.forEach(l => l(tick)));
    conn.on('CandleUpdate', update => this.candleListeners.forEach(l => l(update)));
    conn.onreconnecting(() => this.setMarketState('RECONNECTING'));
    conn.onreconnected(() => this.setMarketState('CONNECTED'));
    conn.onclose(() => this.setMarketState('DISCONNECTED'));
    this.marketConnection = conn;

    this.setMarketState('CONNECTING');
    conn.start()
      .then(() => this.setMarketState('CONNECTED'))
      .catch(err => {
        this.setMarketState('DISCONNECTED');
        console.warn('[SignalR MarketHub] Live connection failed:', err.message);
      });
  }

  private ensureSignalHub() {
    if (this.signalConnection) return;

    const conn = this.build('/hubs/signals');
    conn.on('SignalCreated', signal => this.signalListeners.forEach(l => l(signal)));
    this.signalConnection = conn;

    conn.start().catch(err => {
      console.warn('[SignalR SignalHub] Live connection failed:', err.message);
    });
  }

  public subscribeTicks(listener: Listener<Partial<Ticker> & { symbol: string }>) {
    this.ensureMarketHub();
    this.tickListeners.add(listener);
    return () => { this.tickListeners.delete(listener); };
  }

  public subscribeCandles(listener: Listener<CandleUpdate>) {
    this.ensureMarketHub();
    this.candleListeners.add(listener);
    return () => { this.candleListeners.delete(listener); };
  }

  public subscribeSignals(listener: Listener<Signal>) {
    this.ensureSignalHub();
    this.signalListeners.add(listener);
    return () => { this.signalListeners.delete(listener); };
  }

  public subscribeState(listener: Listener<HubState>) {
    this.stateListeners.add(listener);
    listener(this.marketState);
    return () => { this.stateListeners.delete(listener); };
  }

  public disconnectAll() {
    this.marketConnection?.stop();
    this.signalConnection?.stop();
    this.marketConnection = null;
    this.signalConnection = null;
  }
}

export const signalRManager = new SignalRManager();
