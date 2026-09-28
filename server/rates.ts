import { z } from 'zod';
import type { Currency, ExchangeRates } from "../src/types/index.js";
import { errorResponse, HttpError, json } from "./http.js";

const currencySchema = z.enum(['USD', 'EUR', 'JPY', 'MYR']);
const currencies: Currency[] = ['USD', 'EUR', 'JPY', 'MYR'];
const numberSchema = z.number().positive().finite();
const completeRatesSchema = z.object({ USD: numberSchema, EUR: numberSchema, JPY: numberSchema, MYR: numberSchema });
const providerSchema = z.object({
  result: z.literal('success'), base_code: currencySchema,
  time_last_update_unix: z.number().positive(), conversion_rates: completeRatesSchema,
});
const frankfurterSchema = z.array(z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), base: z.string(), quote: z.string(), rate: numberSchema,
}));
const cache = new Map<Currency, { value: ExchangeRates; fetchedAt: number }>();
const pending = new Map<Currency, Promise<ExchangeRates>>();
const freshMs = 60 * 60 * 1000;
const maximumAgeMs = 7 * 24 * 60 * 60 * 1000;

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, { signal: AbortSignal.timeout(8000), headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error('Exchange-rate provider unavailable.');
  return response.json() as Promise<unknown>;
}

async function primaryRates(base: Currency, key: string): Promise<ExchangeRates> {
  const data = providerSchema.parse(await fetchJson(`https://v6.exchangerate-api.com/v6/${encodeURIComponent(key)}/latest/${base}`));
  if (data.base_code !== base) throw new Error('Exchange-rate base mismatch.');
  return { base, rates: data.conversion_rates, updatedAt: data.time_last_update_unix * 1000, source: 'ExchangeRate-API' };
}

async function fallbackRates(base: Currency): Promise<ExchangeRates> {
  const targets = currencies.filter((currency) => currency !== base).join(',');
  const rows = frankfurterSchema.parse(await fetchJson(`https://api.frankfurter.dev/v2/rates?base=${base}&quotes=${targets}`));
  const rates: Partial<Record<Currency, number>> = { [base]: 1 };
  const dates: number[] = [];
  for (const row of rows) {
    const currency = currencySchema.safeParse(row.quote.toUpperCase());
    if (row.base.toUpperCase() === base && currency.success) {
      rates[currency.data] = row.rate;
      dates.push(Date.parse(`${row.date}T00:00:00Z`));
    }
  }
  return { base, rates: completeRatesSchema.parse(rates), updatedAt: Math.min(...dates), source: 'Frankfurter' };
}

export async function getExchangeRates(base: Currency): Promise<ExchangeRates> {
  const cached = cache.get(base);
  if (cached && Date.now() - cached.fetchedAt < freshMs) return cached.value;
  const existing = pending.get(base);
  if (existing) return existing;
  const load = async (): Promise<ExchangeRates> => {
    let value: ExchangeRates;
    try {
      const key = process.env.EXCHANGE_RATE_API_KEY?.trim();
      value = key ? await primaryRates(base, key).catch(() => fallbackRates(base)) : await fallbackRates(base);
      if (!Number.isFinite(value.updatedAt) || Date.now() - value.updatedAt > maximumAgeMs) {
        throw new Error('Exchange rates are too old.');
      }
      cache.set(base, { value, fetchedAt: Date.now() });
      return value;
    } catch {
      if (cached && Date.now() - cached.value.updatedAt < maximumAgeMs) {
        return { ...cached.value, source: `${cached.value.source} (cached)` };
      }
      throw new HttpError(503, 'Exchange rates are temporarily unavailable. Please try again.');
    }
  };
  const promise = load();
  pending.set(base, promise);
  try { return await promise; } finally { pending.delete(base); }
}

export async function handleRatesRequest(request: Request): Promise<Response> {
  try {
    if (request.method !== 'GET') return json({ error: 'Method not allowed.' }, 405, { Allow: 'GET' });
    const parsed = currencySchema.safeParse(new URL(request.url).searchParams.get('base') ?? 'USD');
    if (!parsed.success) throw new HttpError(400, 'Unsupported base currency.');
    const rates = await getExchangeRates(parsed.data);
    return json(rates, 200, { 'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=3600' });
  } catch (error) { return errorResponse(error); }
}
