import { apiFetch } from './client';
import { Signal } from '../types';

export const signalApi = {
  getSignals: () => apiFetch<Signal[]>('signals', 'signals.json'),
  getSignalById: async (id: string): Promise<Signal | undefined> => {
    const list = await apiFetch<Signal[]>('signals', 'signals.json');
    return list.find(s => s.id === id);
  }
};
