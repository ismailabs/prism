import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { translateHistory, materializeFixture, reconcileHistory } from '../src/domain/ledger-reconciliation.ts';
import { accountingReport } from '../src/domain/accounting.ts';
const fixture = JSON.parse(await readFile('supabase/tests/ledger-history.synthetic.json', 'utf8'));
const translated = translateHistory(fixture), materialized = materializeFixture(translated, fixture.timezone);
if (!reconcileHistory(fixture, translated).accepted) throw new Error('Fixture must reconcile before preview.');
const html = await readFile('scripts/ledger-preview.html', 'utf8');
const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value + 'T00:00:00Z')) && new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) === value;
const server = createServer((req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'");
  if (req.method !== 'GET') { res.writeHead(405); res.end(); return; }
  const url = new URL(req.url, 'http://127.0.0.1');
  if (url.pathname === '/') { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(html); return; }
  if (url.pathname === '/api/report') {
    const currency = url.searchParams.get('currency') ?? 'MYR', start = url.searchParams.get('start') ?? '2000-02-01', end = url.searchParams.get('end') ?? '2000-02-29';
    if (!['MYR', 'USD', 'EUR', 'JPY'].includes(currency) || !validDate(start) || !validDate(end) || start > end) { res.writeHead(400); res.end('Invalid native currency or period.'); return; }
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ fixture: true, timezone: fixture.timezone, report: accountingReport(translated.accounts, materialized.lines, currency, start, end), accounts: translated.accounts.filter(a => a.currency === currency), events: materialized.events.filter(e => e.currency === currency && e.financial_date <= end) })); return;
  }
  res.writeHead(404); res.end();
});
server.listen(Number(process.env.PRISM_LEDGER_PREVIEW_PORT ?? 5182), '127.0.0.1', () => console.log(`Synthetic accounting preview: http://127.0.0.1:${server.address().port}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close());
