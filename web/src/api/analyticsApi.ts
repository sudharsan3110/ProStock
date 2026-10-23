import { apiFetch } from './client';
import { StrategyItem, BacktestSummary, NewsItem, CalendarEvent, SystemHealth } from '../types';

export const analyticsApi = {
  getBacktestResults: () => apiFetch<{ summary: BacktestSummary; monthlyReturns: any[]; equityCurve: any[] }>('backtest/latest', 'backtest-results.json'),
  getStrategies: () => apiFetch<StrategyItem[]>('strategies', 'strategies.json'),
  getRiskTelemetry: () => apiFetch<any>('risk/telemetry', 'risk-telemetry.json'),
  getNews: () => apiFetch<NewsItem[]>('news/sentiment', 'news-sentiment.json'),
  getCalendar: () => apiFetch<CalendarEvent[]>('calendar/events', 'calendar-events.json'),
  getSystemHealth: () => apiFetch<SystemHealth>('telemetry/health', null)
};
