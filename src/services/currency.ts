import { decimalMoney,parseMoneyTotal } from '@/domain/money';
import { useAppStore } from '@/store/useAppStore';
import type { Currency,ExchangeRates,Locale } from '@/types';

export const RATE_CACHE_MS = 60 * 60 * 1_000;
export const MAX_STALE_RATE_MS = 7 * 24 * RATE_CACHE_MS;
const currencies: Currency[] = ['USD', 'EUR', 'JPY', 'MYR'];
const inflight = new Map<Currency, Promise<ExchangeRates>>();

export function isExchangeRates(value: unknown): value is ExchangeRates {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  if (!currencies.includes(candidate.base as Currency) || typeof candidate.updatedAt !== 'number' || !Number.isFinite(candidate.updatedAt) || candidate.updatedAt <= 0 || candidate.updatedAt > Date.now() + 300_000 || typeof candidate.source !== 'string' || !candidate.source.trim()) return false;
  if (!candidate.rates || typeof candidate.rates !== 'object') return false;
  const rates = candidate.rates as Record<string, unknown>;
  return currencies.every((currency) => typeof rates[currency] === 'number' && Number.isFinite(rates[currency]) && Number(rates[currency]) > 0) && Math.abs(Number(rates[candidate.base as Currency]) - 1) < 0.000001;
}

function rebaseRates(rates: ExchangeRates, base: Currency): ExchangeRates {
  const divisor = rates.rates[base];
  return { ...rates, base, rates: { USD: rates.rates.USD / divisor, EUR: rates.rates.EUR / divisor, JPY: rates.rates.JPY / divisor, MYR: rates.rates.MYR / divisor } };
}

export async function fetchExchangeRates(base: Currency): Promise<ExchangeRates> {
  const cached = useAppStore.getState().exchangeRates;
  if (isExchangeRates(cached) && Date.now() - cached.updatedAt < RATE_CACHE_MS) {
    const rebased = rebaseRates(cached, base);
    useAppStore.getState().setExchangeRates(rebased);
    return rebased;
  }
  const existing = inflight.get(base);
  if (existing) return existing;
  const request = (async (): Promise<ExchangeRates> => {
    try {
      const response = await fetch(`/api/rates?base=${base}`, { signal: AbortSignal.timeout(15_000), headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`Exchange-rate service is unavailable (${response.status}).`);
      const payload: unknown = await response.json();
      if (!isExchangeRates(payload) || Date.now() - payload.updatedAt > MAX_STALE_RATE_MS) throw new Error('The exchange-rate service returned invalid or outdated rates.');
      const rates = rebaseRates(payload, base);
      useAppStore.getState().setExchangeRates(rates);
      return rates;
    } catch (error) {
      if (isExchangeRates(cached) && Date.now() - cached.updatedAt <= MAX_STALE_RATE_MS) {
        const stale = { ...rebaseRates(cached, base), source: `${cached.source.replace(/ \(cached\)$/, '')} (cached)` };
        useAppStore.getState().setExchangeRates(stale);
        return stale;
      }
      throw error instanceof Error ? error : new Error('Exchange rates are unavailable. Please try again.');
    } finally {
      inflight.delete(base);
    }
  })();
  inflight.set(base, request);
  return request;
}

export function convertCurrency(amount: string | number, from: Currency, to: Currency, rates: ExchangeRates | null): number {
  if (typeof amount === 'number') {
    if (!Number.isFinite(amount)) throw new Error('The amount must be a finite number.');
    if (from === to) return amount;
    if (!isExchangeRates(rates) || Date.now() - rates.updatedAt > MAX_STALE_RATE_MS) throw new Error('Current exchange rates are required to convert this amount.');
    const converted = (amount / rates.rates[from]) * rates.rates[to];
    if (!Number.isFinite(converted)) throw new Error('The converted amount is out of range.');
    return converted;
  }
  const exact = typeof amount === 'string' ? amount : String(amount);
  const minor = parseMoneyTotal(exact, from);
  if (from === to) return Number(exact);
  if (!isExchangeRates(rates) || Date.now() - rates.updatedAt > MAX_STALE_RATE_MS) throw new Error('Current exchange rates are required to convert this amount.');
  // FX feeds are approximate by nature. Convert only at this presentation boundary;
  // persisted values and same-currency calculations remain exact decimal text.
  const result = (Number(decimalMoney(minor, from)) / rates.rates[from]) * rates.rates[to];
  if (!Number.isFinite(result)) throw new Error('The converted amount is out of range.');
  return result;
}

export function formatCurrency(amount: string | number, currency: Currency, locale: Locale = 'en'): string {
  if (useAppStore.getState().personalization.privacyMode) return `${currency} ••••••`;
  if (typeof amount === 'number') {
    if (!Number.isFinite(amount)) throw new Error('The amount must be a finite number.');
    return new Intl.NumberFormat(locale === 'ms' ? 'ms-MY' : 'en-US', { style: 'currency', currency }).format(amount);
  }
  const exact = typeof amount === 'string' ? amount : String(amount);
  const minor = parseMoneyTotal(exact, currency);
  const scale = currency === 'JPY' ? 0 : 2;
  const whole = minor < 0n ? -minor / 10n ** BigInt(scale) : minor / 10n ** BigInt(scale);
  const fraction = scale ? (minor < 0n ? -minor : minor).toString().padStart(scale + 1, '0').slice(-scale) : '';
  const formatter = new Intl.NumberFormat(locale === 'ms' ? 'ms-MY' : 'en-US', { style: 'currency', currency, minimumFractionDigits: scale, maximumFractionDigits: scale });
  const groupedWhole = new Intl.NumberFormat(locale === 'ms' ? 'ms-MY' : 'en-US', { useGrouping: true, maximumFractionDigits: 0 }).format(whole);
  return formatter.formatToParts(minor < 0n ? -0 : 0).map(part => {
    if (part.type === 'integer') return groupedWhole;
    if (part.type === 'fraction') return fraction;
    return part.value;
  }).join('');
}
