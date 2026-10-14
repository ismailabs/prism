// Real hosted acceptance: the explicitly authorized isolated staging project only.
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash, createHmac, randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const REF = 'zwqcdfzfsudqccclficx';
const ORIGIN = `https://${REF}.supabase.co`;
const SOURCE = '5e9d034cdd6bf516fc7bf335cf4fcbca7efae784';
const TAG = 'PRISM hosted 20261014';
const phase = process.argv.includes('--security') ? 'security' : 'finance';
const selectedGroup = process.argv.find(arg => arg.startsWith('--only='))?.slice(7) ?? null;
const runId = `${Date.now()}-${randomUUID().slice(0, 8)}`;
const paths = ['.cache/prism-staging-client.json', '.cache/prism-staging-actor-a.json', '.cache/prism-staging-actor-b.json'];
const clients = [], cleanup = [], latency = [], http = {};
const receipt = {
  startedAtUTC: new Date().toISOString(), environment: 'STAGING-HOSTED', projectRef: REF,
  apiOrigin: ORIGIN, phase, selectedGroup, partialRun: Boolean(selectedGroup), sourceBaselineSHA: SOURCE, candidateSHA: null,
  harnessSHA256: null, productionContacted: false, privilegedKeyUsed: false,
  syntheticOnly: true, credentialsPublished: false, checks: [], migrations: [],
  provenance: 'Root supplied genuine public-signup/Gmail-confirmed actors; this harness validates their ordinary hosted sessions independently.',
  limits: ['No production operations or provider configuration writes.', 'Browser/OAuth/CAPTCHA/recovery/inbox and human acceptance are separate root workstreams.', 'Backend acceptance does not pass every release gate.'],
};
class Failure extends Error {
  constructor(label, code, status) { super(label); this.label = label; this.code = code; this.status = status; }
}
const expect = (value, label) => { if (!value) throw new Failure(label); };
const equal = (actual, expected, label) => expect(actual === expected, label);
const safeCode = value => typeof value === 'string' ? value.replace(/[^A-Za-z0-9_]/g, '').slice(0, 64) : null;
const ok = (value, label) => {
  if (value.error) throw new Failure(label, safeCode(value.error.code), value.status);
  return value.data;
};
const denied = (value, codes, label) => {
  expect(Boolean(value.error), label);
  expect(codes.includes(value.error.code), `${label}: expected denial code`);
};
const record = async (label, fn) => {
  if (selectedGroup && !label.startsWith('exact staging') && !label.startsWith('temporary owned') && !(selectedGroup === 'recurrence' && label.startsWith('explicit recurrence')) && !(selectedGroup === 'oracle' && label.startsWith('approved native cash'))) return;
  const started = Date.now();
  try { const details = await fn(); receipt.checks.push({ label, status: 'PASS', seconds: (Date.now() - started) / 1000, ...details }); console.log(`PASS hosted backend: ${label}`); }
  catch (error) {
    receipt.checks.push({ label, status: 'FAIL', seconds: (Date.now() - started) / 1000,
      failure: { label: error instanceof Failure ? error.label : 'Unexpected harness failure; raw error withheld', code: safeCode(error.code), status: Number.isInteger(error.status) ? error.status : null } });
    console.error(`FAIL hosted backend: ${label}`); process.exitCode = 1;
  }
};
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
const id = key => {
  const hex = createHash('sha256').update(`${REF}:${TAG}:${key}`).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
};
const guardedFetch = async (input, init = {}) => {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  expect(url.origin === ORIGIN && !url.username && !url.password, 'Every network request must target the exact staging API');
  expect(url.pathname.startsWith('/auth/v1/') || url.pathname.startsWith('/rest/v1/'), 'Only ordinary Auth and Data API routes are allowed');
  const started = Date.now();
  try {
    const response = await fetch(input, { ...init, redirect: 'error', signal: AbortSignal.any([...(init.signal ? [init.signal] : []), AbortSignal.timeout(15000)]) });
    http[response.status] = (http[response.status] ?? 0) + 1;
    return response;
  } finally { latency.push(Date.now() - started); }
};
let configuration, a, b;
const client = token => {
  const value = createClient(ORIGIN, configuration.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: guardedFetch, ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}) },
  });
  clients.push(value); return value;
};
const saveActor = async actor => {
  const session = ok(await actor.db.auth.getSession(), 'Read current private synthetic session').session;
  expect(session?.user?.id === actor.userId, 'Only the actor own session may be saved');
  actor.session = session;
  const { db: _db, path: _path, ...stored } = actor;
  await writeFile(actor.path, JSON.stringify(stored, null, 2) + '\n');
};
const loadActor = async (path, label) => {
  const actor = { ...JSON.parse(await readFile(path, 'utf8')), path };
  expect(actor.session?.user?.id === actor.userId, `${label} private identity and session must match`);
  const claims = JSON.parse(Buffer.from(actor.session.access_token.split('.')[1], 'base64url').toString());
  equal(claims.iss, `${ORIGIN}/auth/v1`, `${label} access token issuer must be staging`);
  equal(claims.sub, actor.userId, `${label} access token subject must be its own synthetic identity`);
  equal(claims.role, 'authenticated', `${label} token must be an ordinary authenticated user`);
  actor.db = client();
  ok(await actor.db.auth.setSession({ access_token: actor.session.access_token, refresh_token: actor.session.refresh_token }), `${label} ordinary session restoration`);
  const user = ok(await actor.db.auth.getUser(), `${label} genuine hosted user verification`).user;
  equal(user.id, actor.userId, `${label} server identity must match its own account`);
  expect(Boolean(user.email_confirmed_at), `${label} server must confirm email verification`);
  await saveActor(actor); return actor;
};
const ensure = async (actor, table, key, values, temporary = false) => {
  const rowId = temporary ? randomUUID() : id(`${actor === a ? 'a' : 'b'}:${key}`);
  const owned = ok(await actor.db.from(table).select('id').eq('id', rowId).eq('user_id', actor.userId), `Read tagged ${table} identity`);
  expect(owned.length <= 1, `Tagged ${table} identity must be unique`);
  if (!owned.length) ok(await actor.db.from(table).insert({ id: rowId, user_id: actor.userId, ...values }), `Insert owned synthetic ${table}`);
  if (temporary) cleanup.push({ actor, table, id: rowId });
  return rowId;
};
const removeTemps = async () => {
  while (cleanup.length) {
    const row = cleanup[cleanup.length - 1];
    const removed = ok(await row.actor.db.from(row.table).delete().eq('id', row.id).eq('user_id', row.actor.userId).select('id'), `Remove exact owned temporary ${row.table}`);
    expect(removed.length <= 1, `Temporary ${row.table} cleanup cannot affect multiple records`);
    equal(ok(await row.actor.db.from(row.table).select('id').eq('id', row.id).eq('user_id', row.actor.userId), `Recheck exact temporary ${row.table}`).length, 0, `Temporary ${row.table} must be absent after cleanup`);
    cleanup.pop();
  }
};
const cents = text => {
  expect(typeof text === 'string' && /^-?\d+(?:\.\d{1,2})?$/.test(text), 'Money must remain decimal text');
  const negative = text.startsWith('-'), [whole, fraction = ''] = text.replace(/^-/, '').split('.');
  const value = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  return negative ? -value : value;
};
const cash = async account => ok(await a.db.from('exact_accounts').select('balance').eq('id', account).single(), 'Read exact owned cash').balance;
const oracleIds = {
  main: id('a:main'), reserve: id('a:reserve'), salary: id('a:salary'), rent: id('a:rent'), groceries: id('a:groceries'),
  goal: id('a:goal'), debt: id('a:debt'), earmark: id('a:earmark'), principal: id('a:principal'),
};
const verifyOracle = async () => {
  equal(await cash(oracleIds.main), '2840.00', 'Native primary cash oracle must be 2840.00');
  equal(await cash(oracleIds.reserve), '2200.00', 'Native reserve cash oracle must be 2200.00');
  const net = ok(await a.db.from('finance_net_flow').select('amount').eq('currency', 'MYR').single(), 'Read ordinary net-flow view').amount;
  equal(cents(net), 214000n, 'Ordinary flow must be 2140.00 independently of balances, transfers and principal');
  const goal = ok(await a.db.from('exact_objectives').select('target_amount').eq('id', oracleIds.goal).single(), 'Read exact goal target');
  const earmark = ok(await a.db.from('exact_objective_contributions').select('effective_amount').eq('id', oracleIds.earmark).single(), 'Read exact goal earmark');
  equal(goal.target_amount, '5000.00', 'Exact goal target must be 5000.00');
  equal(earmark.effective_amount, '3000.00', 'Exact notional earmark must be 3000.00');
  equal(cents(earmark.effective_amount) * 100n, cents(goal.target_amount) * 60n, 'Earmark progress must be exactly sixty percent without integer truncation');
  const debt = ok(await a.db.from('exact_person_debts').select('original_amount').eq('id', oracleIds.debt).single(), 'Read exact debt principal');
  const paid = ok(await a.db.from('exact_debt_repayments').select('effective_amount').eq('id', oracleIds.principal).single(), 'Read exact debt repayment');
  equal(debt.original_amount, '1000.00', 'Exact original debt principal must be 1000.00');
  equal(paid.effective_amount, '100.00', 'Exact cash-funded principal repayment must be 100.00');
  equal(cents(debt.original_amount) - cents(paid.effective_amount), 90000n, 'Remaining debt must be exactly 900.00');
  return { expected: { mainCash: '2840.00', reserveCash: '2200.00', ordinaryNetFlow: '2140.00', goalProgressPercent: '60', debtRemaining: '900.00' } };
};
const tables = ['profiles', 'categories', 'payment_methods', 'transactions', 'accounts', 'objectives', 'objective_milestones', 'objective_contributions', 'person_debts', 'debt_repayments', 'transfers', 'monthly_budgets', 'recurring_rules', 'ledger_accounts', 'financial_events', 'journals', 'journal_lines', 'ledger_allocations', 'reserve_plans', 'debt_plans', 'goal_action_plans', 'financial_notes', 'financial_reminders', 'action_receipts', 'action_preferences'];
const views = ['exact_transactions', 'exact_accounts', 'exact_objectives', 'exact_objective_milestones', 'exact_objective_contributions', 'exact_person_debts', 'exact_debt_repayments', 'exact_transfers', 'finance_monthly_totals', 'finance_net_flow', 'exact_monthly_budgets', 'exact_recurring_rules', 'exact_ledger_lines', 'exact_ledger_allocations', 'exact_reserve_plans', 'exact_debt_plans', 'exact_goal_action_plans', 'finance_daily_totals', 'finance_list_usage'];
const own = { a: {}, b: {} };

try {
  expect(!selectedGroup || (phase === 'finance' && ['recurrence', 'oracle'].includes(selectedGroup)), 'Selected group must be a declared finance test group');
  for (const path of paths) execFileSync('git', ['check-ignore', '-q', '--', path], { stdio: 'ignore' });
  configuration = JSON.parse(await readFile(paths[0], 'utf8'));
  equal(configuration.projectRef, REF, 'Private client project ref must be exact isolated staging');
  const api = new URL(configuration.url);
  equal(api.origin, ORIGIN, 'Private client origin must be exact isolated staging');
  expect(api.pathname === '/' && !api.search && !api.hash && !api.username && !api.password, 'Private client URL must contain no additional target or credentials');
  expect(typeof configuration.anonKey === 'string' && !configuration.anonKey.startsWith('sb_secret_'), 'Only an intended public API key is permitted');
  if (!configuration.anonKey.startsWith('sb_publishable_')) {
    const claims = JSON.parse(Buffer.from(configuration.anonKey.split('.')[1], 'base64url').toString());
    equal(claims.role, 'anon', 'Legacy API key must have only the anonymous role');
    equal(claims.ref, REF, 'Legacy API key must be scoped to isolated staging');
  }
  receipt.candidateSHA = git('rev-parse', 'HEAD');
  execFileSync('git', ['merge-base', '--is-ancestor', SOURCE, 'HEAD'], { stdio: 'ignore' });
  // Settings deletion notices have a separate reviewed privacy-copy repair.
  // This backend harness pins SQL, money/domain semantics and data/Auth hooks;
  // the final preview/UI source is independently retested by the root mission.
  const sourceScope = ['supabase/migrations', 'src/domain', 'src/lib/finance.ts', 'src/lib/supabase.ts', 'src/hooks', 'src/components/financial', ':(exclude)src/components/financial/Settings.tsx'];
  execFileSync('git', ['diff', '--exit-code', SOURCE, '--', ...sourceScope], { stdio: 'ignore' });
  receipt.sourceGuardScope = sourceScope;
  const migrations = (await readdir('supabase/migrations')).filter(file => file.endsWith('.sql')).sort();
  equal(migrations.length, 18, 'The reviewed eighteen-migration chain must be preserved');
  for (const file of migrations) {
    const path = `supabase/migrations/${file}`;
    const bytes = execFileSync('git', ['show', `${SOURCE}:${path}`], { stdio: ['ignore', 'pipe', 'ignore'] });
    equal((await readFile(path, 'utf8')).replaceAll('\r\n', '\n'), bytes.toString('utf8'), 'Canonical reviewed migration bytes must be unchanged');
    receipt.migrations.push({ file, sourceSHA256: createHash('sha256').update(bytes).digest('hex') });
  }
  receipt.harnessSHA256 = createHash('sha256').update(await readFile('scripts/hosted-supabase-acceptance.mjs')).digest('hex');
  a = await loadActor(paths[1], 'A'); b = await loadActor(paths[2], 'B');
  expect(a.userId !== b.userId, 'The synthetic test users must be distinct');
  await record('exact staging target, source chain and genuine A/B sessions', async () => ({ reviewedMigrationCount: 18, ordinaryActors: 2 }));

  if (phase === 'finance') {
    await record('approved native cash, ordinary-flow, earmark and principal oracle', async () => {
      const housing = await ensure(a, 'categories', 'housing', { name: `${TAG} Housing`, type: 'expense', color: '#176b58' });
      const food = await ensure(a, 'categories', 'food', { name: `${TAG} Food`, type: 'expense', color: '#84602e' });
      own.a.category = housing;
      own.a.account = await ensure(a, 'accounts', 'main', { name: `${TAG} Everyday account`, currency: 'MYR', opening_balance: '1000.00' });
      await ensure(a, 'accounts', 'reserve', { name: `${TAG} Reserve account`, currency: 'MYR', opening_balance: '2000.00' });
      for (const [key, amount, type, category] of [['salary', '5200.00', 'income', null], ['rent', '2200.00', 'expense', housing], ['groceries', '860.00', 'expense', food]])
        await ensure(a, 'transactions', key, { amount, type, category_id: category, account_id: oracleIds.main, currency: 'MYR', description: `${TAG} ${key}`, transaction_date: '2026-10-10T04:00:00Z' });
      await ensure(a, 'transfers', 'transfer', { source_account_id: oracleIds.main, destination_account_id: oracleIds.reserve, source_currency: 'MYR', destination_currency: 'MYR', source_amount: '200.00', destination_amount: '200.00', occurred_at: '2026-10-11T04:00:00Z', note: TAG });
      await ensure(a, 'objectives', 'goal', { kind: 'goal', name: `${TAG} Emergency fund`, target_amount: '5000.00', currency: 'MYR', category: 'Safety' });
      await ensure(a, 'objective_contributions', 'earmark', { objective_id: oracleIds.goal, currency: 'MYR', amount: '3000.00', contributed_at: '2026-10-11T04:00:00Z', note: TAG });
      await ensure(a, 'person_debts', 'debt', { direction: 'i_owe', counterparty: `${TAG} Synthetic lender`, original_amount: '1000.00', currency: 'MYR', due_date: '2026-10-20' });
      await ensure(a, 'debt_repayments', 'principal', { debt_id: oracleIds.debt, currency: 'MYR', amount: '100.00', account_id: oracleIds.main, paid_at: '2026-10-12T04:00:00Z', note: TAG });
      a.fixtureIds = oracleIds; await saveActor(a);
      return verifyOracle();
    });
    await record('B owned fixtures and A-to-B valid read/insert/update/delete denial', async () => {
      own.b.category = await ensure(b, 'categories', 'category', { name: `${TAG} B private category`, type: 'expense' });
      own.b.account = await ensure(b, 'accounts', 'account', { name: `${TAG} B private account`, currency: 'MYR', opening_balance: '37.00' });
      own.b.transaction = await ensure(b, 'transactions', 'transaction', { description: `${TAG} B private transaction`, amount: '1.00', currency: 'MYR', type: 'expense', transaction_date: '2026-10-10T04:00:00Z' });
      own.b.note = await ensure(b, 'financial_notes', 'note', { title: `${TAG} B private note`, body: 'Synthetic owner-isolation marker' });
      own.b.goal = await ensure(b, 'objectives', 'goal', { kind: 'goal', name: `${TAG} B private goal`, currency: 'MYR', target_amount: '100.00' });
      own.b.debt = await ensure(b, 'person_debts', 'debt', { direction: 'i_owe', counterparty: `${TAG} B private debt`, currency: 'MYR', original_amount: '100.00' });
      const cases = [
        ['categories', own.b.category, { name: `${TAG} denied category`, type: 'expense' }, { name: `${TAG} unauthorized edit` }],
        ['accounts', own.b.account, { name: `${TAG} denied account`, currency: 'MYR', opening_balance: '0.00' }, { name: `${TAG} unauthorized edit` }],
        ['transactions', own.b.transaction, { amount: '1.00', currency: 'MYR', type: 'expense', description: `${TAG} denied transaction` }, { description: `${TAG} unauthorized edit` }],
        ['financial_notes', own.b.note, { title: `${TAG} denied note` }, { body: 'Unauthorized edit' }],
        ['objectives', own.b.goal, { kind: 'goal', name: `${TAG} denied goal`, currency: 'MYR', target_amount: '100.00' }, { name: `${TAG} unauthorized edit` }],
        ['person_debts', own.b.debt, { direction: 'i_owe', counterparty: `${TAG} denied debt`, currency: 'MYR', original_amount: '100.00' }, { notes: 'Unauthorized edit' }],
      ];
      for (const [table, rowId, values, update] of cases) {
        equal(ok(await a.db.from(table).select('id').eq('id', rowId), `Foreign ${table} read`).length, 0, `A must not read B ${table}`);
        const attackId = randomUUID();
        denied(await a.db.from(table).insert({ id: attackId, user_id: b.userId, ...values }), ['42501'], `A must not insert B ${table}`);
        equal(ok(await a.db.from(table).update(update).eq('id', rowId).select('id'), `Foreign ${table} update`).length, 0, `A must not update B ${table}`);
        equal(ok(await a.db.from(table).delete().eq('id', rowId).select('id'), `Foreign ${table} delete`).length, 0, `A must not delete B ${table}`);
        equal(ok(await b.db.from(table).select('id').eq('id', rowId), `B retained ${table} read`).length, 1, `B must retain its private ${table}`);
        equal(ok(await b.db.from(table).select('id').eq('id', attackId), `B checks denied foreign insertion`).length, 0, `Foreign ${table} insertion must leave no record`);
      }
      denied(await a.db.from('categories').update({ user_id: b.userId }).eq('id', own.a.category), ['42501'], 'Owned category cannot be reassigned across users');
      b.fixtureIds = own.b; await saveActor(b);
      return { existingBResourcesTested: 6, CRUDDirections: 'A cannot read/insert/update/delete B; B rechecks retained records' };
    });
    await record('25 base tables and 19 invoker views: anonymous and reciprocal owner denial', async () => {
      const anonymous = client();
      for (const table of [...tables, ...views]) {
        const owner = table === 'profiles' ? 'id' : 'user_id';
        denied(await anonymous.from(table).select(owner).limit(1), ['42501'], `Anonymous ${table} read must be denied`);
        equal(ok(await a.db.from(table).select(owner).eq(owner, b.userId).limit(50), `A foreign-owner ${table} read`).length, 0, `A cannot see B through ${table}`);
        equal(ok(await b.db.from(table).select(owner).eq(owner, a.userId).limit(50), `B foreign-owner ${table} read`).length, 0, `B cannot see A through ${table}`);
      }
      return { anonymousSurfacesDenied: 44, reciprocalOwnerFiltersDenied: 88, qualifier: 'Six B resources have concrete retained rows; empty shadow surfaces also inherit reviewed hosted metadata.' };
    });
    await record('MYR/USD/EUR/JPY huge decimal text and invalid precision', async () => {
      for (const currency of ['MYR', 'USD', 'EUR', 'JPY']) {
        const opening = currency === 'JPY' ? '9007199254740993' : '90071992547409.93';
        const increment = currency === 'JPY' ? '1' : '0.01';
        const expected = currency === 'JPY' ? '9007199254740994' : '90071992547409.94';
        const account = await ensure(a, 'accounts', `huge-${currency}`, { name: `${TAG} temporary ${currency}`, currency, opening_balance: opening }, true);
        const tx = await ensure(a, 'transactions', `huge-${currency}-tx`, { account_id: account, currency, amount: increment, type: 'income', description: `${TAG} temporary exact ${currency}`, transaction_date: '2026-10-10T04:00:00Z' }, true);
        const exact = ok(await a.db.from('exact_accounts').select('opening_balance,balance').eq('id', account).single(), `${currency} exact text view`);
        equal(exact.opening_balance, opening, `${currency} huge opening must retain exact text`); equal(exact.balance, expected, `${currency} huge balance must retain exact minor unit`);
        const bad = currency === 'JPY' ? '1.1' : '1.001';
        denied(await a.db.from('accounts').insert({ user_id: a.userId, name: `${TAG} invalid precision ${currency}`, currency, opening_balance: bad }), ['23514'], `${currency} account precision rejection`);
        denied(await a.db.from('transactions').insert({ user_id: a.userId, amount: bad, currency, type: 'expense', description: `${TAG} invalid precision` }), ['23514'], `${currency} transaction precision rejection`);
        expect(Boolean(tx), 'Exact-money temporary transaction identity must exist');
      }
      await removeTemps(); return { currencies: 4, precisionDenials: 8, moneyTransport: 'decimal text; independent integer oracle' };
    });
    await record('explicit recurrence confirmation, timezone and retry idempotency', async () => {
      const rule = await ensure(a, 'recurring_rules', 'recurrence', { description: `${TAG} temporary confirmed recurrence`, amount: '7.00', currency: 'MYR', type: 'expense', frequency: 'monthly', start_date: '2026-10-01' }, true);
      equal(ok(await a.db.from('transactions').select('id').eq('recurrence_id', rule), 'Unconfirmed recurrence must have no posting').length, 0, 'Creating a rule must not post money');
      denied(await a.db.rpc('record_recurring_occurrence', { p_rule_id: rule, p_index: 0, p_date: '2026-10-02' }), ['P0001'], 'Wrong occurrence date must be denied');
      const args = { p_rule_id: rule, p_index: 0, p_date: '2026-10-01' };
      const result = ok(await a.db.rpc('record_recurring_occurrence', args), 'User confirms due occurrence');
      cleanup.push({ actor: a, table: 'transactions', id: result });
      equal(ok(await a.db.rpc('record_recurring_occurrence', args), 'Retry confirmed occurrence'), result, 'Retry must return original occurrence identity');
      // The stable exact view predates the recurrence columns. Resolve owned
      // recurrence identity on its source table, then read exact money by id.
      const sourceRows = ok(await a.db.from('transactions').select('id').eq('recurrence_id', rule), 'Resolve owned confirmed recurrence identity');
      equal(sourceRows.length, 1, 'Source recurrence must contain exactly one transaction');
      const rows = ok(await a.db.from('exact_transactions').select('amount,financial_date,activity_kind').in('id', sourceRows.map(row => row.id)), 'Read confirmed recurrence');
      equal(rows.length, 1, 'Exactly one recurrence transaction must exist'); equal(rows[0].amount, '7.00', 'Recurrence amount must be exact'); equal(rows[0].financial_date, '2026-10-01', 'Recurrence date must use the financial timezone');
      denied(await b.db.rpc('record_recurring_occurrence', args), ['P0001'], 'Foreign recurring-rule RPC must be denied');
      await removeTemps(); return { implicitPosting: false, identicalRetryCount: 1, duplicateRows: 0 };
    });
    await record('bounded exact import RPC, retry deduplication and atomic invalid-batch rejection', async () => {
      const batch = randomUUID();
      const rows = [{ date: '2026-10-04', amount: '3.01', currency: 'MYR', type: 'expense', description: `${TAG} temporary import ${runId}` }];
      equal(ok(await a.db.rpc('import_transactions', { p_rows: rows, p_batch: batch, p_skip_duplicates: false }), 'Exact user import'), 1, 'First import must insert exactly one row');
      const inserted = ok(await a.db.from('transactions').select('id').eq('import_key', `${batch}:1`), 'Read owned imported identity');
      equal(inserted.length, 1, 'Imported own row must exist'); cleanup.push({ actor: a, table: 'transactions', id: inserted[0].id });
      equal(ok(await a.db.rpc('import_transactions', { p_rows: rows, p_batch: batch, p_skip_duplicates: false }), 'Identical import retry'), 0, 'Same-batch retry must insert no duplicate');
      equal(ok(await a.db.rpc('import_transactions', { p_rows: rows, p_batch: randomUUID(), p_skip_duplicates: true }), 'Selected semantic duplicate skip'), 0, 'Selected semantic duplicate skip must insert no duplicate');
      const invalidBatch = randomUUID();
      denied(await a.db.rpc('import_transactions', { p_rows: [...rows, { ...rows[0], amount: 1 }], p_batch: invalidBatch, p_skip_duplicates: false }), ['P0001'], 'JSON-number import amount must be rejected');
      equal(ok(await a.db.from('transactions').select('id').like('import_key', `${invalidBatch}:%`), 'Atomic rejected import read').length, 0, 'Failed import must roll back all rows');
      denied(await a.db.rpc('import_transactions', { p_rows: [{ ...rows[0], account_id: own.b.account }], p_batch: randomUUID(), p_skip_duplicates: false }), ['23503'], 'Foreign-account import must be denied');
      await removeTemps(); return { firstInsert: 1, sameBatchRetry: 0, selectedSemanticDuplicateInsert: 0, numericAmountRejected: true, failedBatchRows: 0 };
    });
    await record('plans, notes, reminders, DST denial and notification receipt retries preserve cash', async () => {
      const budget = await ensure(a, 'monthly_budgets', 'budget', { category_id: own.a.category, currency: 'MYR', month: '2026-10-01', amount: '2500.00', rollover_enabled: true, alert_percent: 80 });
      const spent = ok(await a.db.from('exact_monthly_budgets').select('amount,spent').eq('id', budget).single(), 'Exact ordinary monthly budget');
      equal(spent.amount, '2500.00', 'Budget must retain exact planned amount'); equal(cents(spent.spent), 220000n, 'Budget spending must count housing only, excluding transfers/principal');
      await ensure(a, 'reserve_plans', 'reserve-plan', { month: '2026-10-01', currency: 'MYR', name: `${TAG} planned buffer`, amount: '500.00' });
      await ensure(a, 'debt_plans', 'debt-plan', { debt_id: oracleIds.debt, currency: 'MYR', debt_type: 'personal', scenario_principal: '900.00', balance_as_of: '2026-10-13', apr_bps: 0, rate_mode: 'fixed', minimum_payment: '100.00', frequency: 'monthly', first_payment_date: '2026-10-31' });
      await ensure(a, 'goal_action_plans', 'goal-plan', { objective_id: oracleIds.goal, account_id: oracleIds.reserve, currency: 'MYR', cadence_amount: '100.00', frequency: 'monthly', start_date: '2026-10-15' });
      const note = await ensure(a, 'financial_notes', 'note', { title: `${TAG} private buffer note`, body: '<script>synthetic plain text only</script>', tags: ['buffer'], transaction_id: oracleIds.rent });
      await ensure(a, 'financial_reminders', 'reminder', { title: `${TAG} review goal`, due_local: '2026-10-15T10:00:00', timezone: 'Asia/Kuala_Lumpur', objective_id: oracleIds.goal });
      denied(await a.db.from('financial_reminders').insert({ user_id: a.userId, title: `${TAG} denied DST gap`, due_local: '2026-03-08T02:30:00', timezone: 'America/New_York' }), ['P0001'], 'Missing DST reminder time must be rejected');
      denied(await a.db.from('financial_reminders').insert({ user_id: a.userId, title: `${TAG} denied DST fold`, due_local: '2026-11-01T01:30:00', timezone: 'America/New_York' }), ['P0001'], 'Ambiguous DST reminder time must be rejected');
      equal(ok(await a.db.from('financial_notes').select('id').textSearch('search_document', 'buffer', { config: 'simple', type: 'plain' }).eq('id', note), 'Private note search').length, 1, 'Owned note search must find its own tagged record');
      const occurrence_key = `${TAG}:notification:one`;
      for (let i = 0; i < 2; i++) ok(await a.db.from('action_receipts').upsert({ user_id: a.userId, occurrence_key, state: 'read' }, { onConflict: 'user_id,occurrence_key' }), 'Owned notification receipt retry');
      equal(ok(await a.db.from('action_receipts').select('id').eq('occurrence_key', occurrence_key), 'Read retried notification receipt').length, 1, 'Notification retry must preserve one receipt');
      await verifyOracle(); return { planningPostsCash: false, noteSearch: true, dstDenials: 2, notificationReceiptsAfterRetry: 1 };
    });
    await record('private schema, sensitive RPC, ownership, debt-history and pagination guards', async () => {
      const anonymous = client();
      denied(await a.db.schema('prism_private').rpc('session_allowed'), ['PGRST106'], 'Private function schema must not be a Data API surface');
      denied(await a.db.schema('prism_private').from('report_reservations').select('id'), ['PGRST106'], 'Private reservation schema must not be a Data API surface');
      denied(await a.db.rpc('delete_own_account', { confirmation: 'KEEP' }), ['22023'], 'Unconfirmed self-deletion must be denied');
      denied(await anonymous.rpc('delete_own_account', { confirmation: 'KEEP' }), ['42501'], 'Anonymous self-deletion RPC must be denied');
      denied(await a.db.from('ledger_accounts').insert({ user_id: a.userId, code: 'hosted-direct-write-denial', classification: 'asset', currency: 'MYR' }), ['42501'], 'Client cannot bypass exclusive ledger-account RPC write path');
      denied(await anonymous.rpc('create_ledger_account', { p: { code: 'hosted-anon-denial', classification: 'asset', currency: 'MYR' } }), ['42501'], 'Anonymous ledger-account RPC must be denied');
      denied(await a.db.from('debt_repayments').update({ amount: '99.00' }).eq('id', oracleIds.principal), ['P0001'], 'Recorded principal history cannot be rewritten');
      denied(await a.db.from('person_debts').delete().eq('id', oracleIds.debt), ['P0001'], 'Debt with repayment history cannot be erased');
      denied(await a.db.from('accounts').delete().eq('id', oracleIds.main), ['23503'], 'Financial account with source activity cannot be deleted');
      const page = ok(await a.db.rpc('transaction_page', { p_filters: { currency: 'MYR', account: oracleIds.main, from: '2026-10-01', to: '2026-10-31' }, p_page: 1 }), 'Owned exact transaction pagination');
      equal(page.total, 3, 'Oracle current-period page must contain exactly three ordinary transactions');
      expect(page.rows.every(row => row.user_id === a.userId && typeof row.amount === 'string'), 'Pagination must preserve owner and decimal-text transport');
      const foreign = ok(await a.db.rpc('transaction_page', { p_filters: { account: own.b.account }, p_page: 1 }), 'Foreign-account filtered pagination');
      equal(foreign.total, 0, 'Pagination must not expose foreign accounts');
      const daily = ok(await a.db.from('finance_daily_totals').select('financial_date,type,amount').eq('currency', 'MYR').eq('financial_date', '2026-10-10'), 'Real daily analytics');
      equal(daily.reduce((sum, row) => sum + (row.type === 'income' ? cents(row.amount) : -cents(row.amount)), 0n), 214000n, 'Daily ordinary analytics must equal independent source flow');
      await verifyOracle(); return { privateSchemaDenied: true, privilegedWritesDenied: true, destructiveHistoryChangesDenied: true, sourcePageRows: 3 };
    });
    await record('retained oracle remains exact after hosted workflow checks', verifyOracle);
  } else {
    const otp = (secret, seconds = Date.now() / 1000) => {
      let bits = '';
      for (const ch of secret.toUpperCase().replaceAll('=', '')) { const value = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.indexOf(ch); expect(value >= 0, 'Private TOTP must use base32'); bits += value.toString(2).padStart(5, '0'); }
      const bytes = Buffer.from(Array.from({ length: Math.floor(bits.length / 8) }, (_, i) => parseInt(bits.slice(i * 8, i * 8 + 8), 2)));
      const counter = Buffer.alloc(8); counter.writeBigUInt64BE(BigInt(Math.floor(seconds / 30)));
      const digest = createHmac('sha1', bytes).update(counter).digest(), offset = digest[digest.length - 1] & 15;
      return String((digest.readUInt32BE(offset) & 0x7fffffff) % 1000000).padStart(6, '0');
    };
    equal(otp('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', 59), '287082', 'TOTP implementation must match RFC6238 test vector');
    let factor;
    await record('actual hosted TOTP, wrong/foreign denial, AAL1 restrictions and AAL2 access', async () => {
      const stale = client(a.session.access_token);
      factor = ok(await a.db.auth.mfa.enroll({ factorType: 'totp', friendlyName: `${TAG} authenticator` }), 'Real own TOTP enrollment');
      expect(Boolean(factor.id && factor.totp?.secret), 'Hosted enrollment must return a real private factor');
      denied(await b.db.auth.mfa.challenge({ factorId: factor.id }), ['mfa_factor_not_found'], 'B cannot challenge A factor');
      const challenge = ok(await a.db.auth.mfa.challenge({ factorId: factor.id }), 'Real wrong-code challenge');
      const code = otp(factor.totp.secret), wrong = String((Number(code) + 1) % 1000000).padStart(6, '0');
      denied(await a.db.auth.mfa.verify({ factorId: factor.id, challengeId: challenge.id, code: wrong }), ['mfa_verification_failed'], 'Wrong actual TOTP must be rejected');
      const verified = ok(await a.db.auth.mfa.challengeAndVerify({ factorId: factor.id, code: otp(factor.totp.secret) }), 'Real own TOTP verification');
      expect(Boolean(verified.access_token), 'Verification must yield actual AAL2 session');
      equal(JSON.parse(Buffer.from(verified.access_token.split('.')[1], 'base64url').toString()).aal, 'aal2', 'Actual verified token must be AAL2');
      equal(ok(await stale.from('accounts').select('id'), 'Real stale AAL1 read').length, 0, 'AAL1 cannot read private accounts after enrollment');
      denied(await stale.from('categories').insert({ user_id: a.userId, name: `${TAG} forbidden AAL1`, type: 'expense' }), ['42501'], 'AAL1 cannot write after enrollment');
      equal(await cash(oracleIds.main), '2840.00', 'AAL2 must retain permitted exact own cash read');
      ok(await a.db.auth.mfa.unenroll({ factorId: factor.id }), 'Own verified TOTP unenrollment'); factor = null;
      const refreshed = ok(await a.db.auth.refreshSession(), 'Real own session refresh');
      equal(refreshed.user.id, a.userId, 'Refresh must preserve own identity'); await saveActor(a);
      return { genuineTOTP: true, foreignAndWrongCodeDenied: true, insufficientAssuranceReadWriteDenied: true, AAL2OwnRead: true, unenrolled: true, realRefresh: true };
    });
    if (factor) {
      await record('safe own synthetic factor cleanup', async () => { ok(await a.db.auth.mfa.unenroll({ factorId: factor.id }), 'Own synthetic factor cleanup'); factor = null; });
    }
    await record('actual global sign-out denies unexpired-session reads, writes and refresh', async () => {
      const session = ok(await a.db.auth.getSession(), 'Read own pre-revocation session').session;
      expect(Boolean(session?.access_token && session.refresh_token), 'Revocation needs an actual current own session');
      const stale = client(session.access_token);
      expect(ok(await stale.from('accounts').select('id'), 'Owned read before revocation').length >= 2, 'Session must work before revocation');
      ok(await a.db.auth.signOut({ scope: 'global' }), 'Actual own global sign-out');
      equal(ok(await stale.from('accounts').select('id'), 'Revoked unexpired session read').length, 0, 'Revoked session must not read finances');
      denied(await stale.from('categories').insert({ user_id: a.userId, name: `${TAG} forbidden revoked`, type: 'expense' }), ['42501'], 'Revoked session must not write');
      denied(await client().auth.refreshSession({ refresh_token: session.refresh_token }), ['refresh_token_not_found', 'session_not_found', 'refresh_token_already_used'], 'Globally revoked refresh token must not refresh');
      return { actualRevocation: true, unexpiredJWTReadWriteDenied: true, refreshDenied: true };
    });
    await record('restore A ordinary genuine session and preserved financial oracle', async () => {
      ok(await a.db.auth.signInWithPassword({ email: a.email, password: a.password }), 'Normal own sign-in after testing'); await saveActor(a);
      return verifyOracle();
    });
  }
} catch (error) {
  receipt.checks.push({ label: 'setup/source/identity guard', status: 'FAIL', failure: { label: error instanceof Failure ? error.label : 'Guard failed; raw private details withheld', code: safeCode(error.code) } });
  console.error('FAIL hosted backend: setup/source/identity guard'); process.exitCode = 1;
} finally {
  if (cleanup.length && a?.db) await record('temporary owned synthetic record cleanup', removeTemps);
  for (const value of clients) value.auth.stopAutoRefresh();
  receipt.finishedAtUTC = new Date().toISOString(); receipt.status = receipt.checks.every(check => check.status === 'PASS') ? 'PASS' : 'FAIL';
  const sorted = [...latency].sort((x, y) => x - y);
  receipt.transport = { stagingRequests: latency.length, statusCounts: http, medianMilliseconds: sorted[Math.floor(sorted.length / 2)] ?? null, p95Milliseconds: sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * .95))] ?? null };
  await mkdir('artifacts/public-launch', { recursive: true });
  const json = JSON.stringify(receipt, null, 2) + '\n';
  await writeFile(`artifacts/public-launch/hosted-backend-${phase}-${runId}.json`, json);
  await writeFile(`artifacts/public-launch/hosted-backend-${phase}${selectedGroup ? `-${selectedGroup}` : ''}.json`, json);
  console.log(`${receipt.status} hosted backend ${phase}: ${receipt.checks.filter(check => check.status === 'PASS').length}/${receipt.checks.length} groups; ${latency.length} guarded staging requests`);
}
