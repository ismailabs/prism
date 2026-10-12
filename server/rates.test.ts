import { afterEach, beforeEach, expect, it, vi } from 'vitest';

beforeEach(() => { vi.resetModules(); vi.stubEnv('EXCHANGE_RATE_PROVIDER', ''); vi.stubEnv('EXCHANGE_RATE_API_KEY', 'synthetic-legacy-provider-key'); });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

it('uses only the free no-key provider by default, including with a legacy key', async () => {
  const fetch = vi.fn(async (url: string) => {
    const base = new URL(url).searchParams.get('base')!;
    return new Response(JSON.stringify(['USD', 'EUR', 'JPY', 'MYR'].filter(quote => quote !== base).map(quote => ({ base, quote, rate: 2, date: new Date().toISOString().slice(0, 10) }))));
  });
  vi.stubGlobal('fetch', fetch);
  const { getExchangeRates } = await import('./rates');
  for (const currency of ['USD', 'EUR', 'JPY', 'MYR'] as const) {
    const rates = await getExchangeRates(currency);
    expect(rates.base).toBe(currency);
    expect(rates.rates[currency]).toBe(1);
    expect(rates.source).toBe('Frankfurter');
    await getExchangeRates(currency);
  }
  expect(fetch).toHaveBeenCalledTimes(4);
  for (const [url] of fetch.mock.calls) {
    expect(new URL(url).hostname).toBe('api.frankfurter.dev');
    expect(url).not.toContain('synthetic-legacy-provider-key');
  }
});

it('retains explicit provider selection and falls back safely when it fails', async () => {
  vi.stubEnv('EXCHANGE_RATE_PROVIDER', 'exchangerate-api');
  const fetch = vi.fn(async (url: string) => {
    if (new URL(url).hostname === 'v6.exchangerate-api.com') return new Response('', { status: 503 });
    return new Response(JSON.stringify(['EUR', 'JPY', 'MYR'].map(quote => ({ base: 'USD', quote, rate: 2, date: new Date().toISOString().slice(0, 10) }))));
  });
  vi.stubGlobal('fetch', fetch);
  const { getExchangeRates } = await import('./rates');
  expect((await getExchangeRates('USD')).source).toBe('Frankfurter');
  expect(fetch).toHaveBeenCalledTimes(2);
});

it('fails safely when the free provider cannot supply a complete current set', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify([{ base: 'USD', quote: 'EUR', rate: 2, date: '2000-01-01' }]))));
  const { handleRatesRequest } = await import('./rates');
  const response = await handleRatesRequest(new Request('https://prism.invalid/api/rates?base=USD'));
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ error: 'Exchange rates are temporarily unavailable. Please try again.' });
});
