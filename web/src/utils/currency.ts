import { Market } from '../types';

/**
 * Display symbol for the currency an instrument is quoted in. Prefers the server-provided
 * `currency`; falls back to the market (crypto pairs and US equities quote in dollars).
 */
export function currencyOf(item?: { currency?: string; market?: Market | string } | null): string {
  if (item?.currency) return item.currency;
  return item?.market === 'CRYPTO' || item?.market === 'US' ? '$' : '₹';
}

export function formatMoney(value: number | undefined | null, currency: string, digits = 2): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '—';
  return `${currency}${value.toLocaleString(currency === '₹' ? 'en-IN' : 'en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  })}`;
}

/** Compact volume: 1.25M, 38.4K. */
export function formatCompact(value: number | undefined | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '—';
  return Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(value);
}
