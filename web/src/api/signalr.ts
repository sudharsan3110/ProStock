import * as signalR from '@microsoft/signalr';

const HUB_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL
  ? (import.meta as any).env.VITE_API_BASE_URL.replace('/api/v1', '')
  : 'http://localhost:5000';

class SignalRManager {
  private marketConnection: signalR.HubConnection | null = null;
  private signalConnection: signalR.HubConnection | null = null;

  public initMarketHub(onTick: (tick: any) => void) {
    if (this.marketConnection) return;

    this.marketConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${HUB_BASE_URL}/hubs/market`, {
        accessTokenFactory: () => localStorage.getItem('prostock_token') || ''
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    this.marketConnection.on('TickUpdate', onTick);

    this.marketConnection.start().catch(err => {
      console.warn('[SignalR MarketHub] Live connection failed (running in offline/mock mode):', err.message);
    });
  }

  public initSignalHub(onSignal: (signal: any) => void) {
    if (this.signalConnection) return;

    this.signalConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${HUB_BASE_URL}/hubs/signals`, {
        accessTokenFactory: () => localStorage.getItem('prostock_token') || ''
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    this.signalConnection.on('SignalCreated', onSignal);

    this.signalConnection.start().catch(err => {
      console.warn('[SignalR SignalHub] Live connection failed (running in offline/mock mode):', err.message);
    });
  }

  public disconnectAll() {
    this.marketConnection?.stop();
    this.signalConnection?.stop();
    this.marketConnection = null;
    this.signalConnection = null;
  }
}

export const signalRManager = new SignalRManager();
