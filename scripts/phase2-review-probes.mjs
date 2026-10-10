// Independent offline probes. No provider connection, credentials or migration execution.
// Exit 1 means the reviewed implementation violates a readiness condition.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { translateHistory, reconcileHistory } from '../src/domain/ledger-reconciliation.ts';
import { PGlite } from '@electric-sql/pglite';
const original = JSON.parse(await readFile('supabase/tests/ledger-history.synthetic.json', 'utf8'));
const cases = [];
const baseline = reconcileHistory(original);
cases.push({ name: 'existing synthetic baseline', pass: baseline.accepted, observed: baseline.counts });
{
  const f = structuredClone(original);
  f.cutoff = '2000-02-29T15:59:59.000100Z';
  const row = f.transactions.at(-1);
  row.transaction_date = '2000-02-29T15:59:59.000900Z';
  const t = translateHistory(f), r = reconcileHistory(f, t);
  const posted = t.postings.find(p => p.legacy_id === row.id);
  cases.push({ name: 'record 800 microseconds after cutoff must remain deferred', pass: !posted && r.counts.deferred === 1 && r.balanceSheets[0].income === '5000.00', observed: { cutoff: f.cutoff, sourceInstant: row.transaction_date, translatedInstant: posted?.occurred_at, accepted: r.accepted, deferred: r.counts.deferred, assets: r.balanceSheets[0].assets, income: r.balanceSheets[0].income } });
}
{
  // Scalar SELECT only: no schema creation, application migrations or fixture writes.
  // Expand the existing helper for an owned current session + verified factor,
  // with the signed-context aal value absent/null.
  const db = new PGlite();
  try {
    const helper = (await db.query(`select
      (true and true and true and (not true or null::text='aal2')) as session_allowed,
      (false or not (true and true and true and (not true or null::text='aal2'))) as old_rejection_condition`)).rows[0];
    const source = await readFile('supabase/migrations/20261009220402_shadow_double_entry_ledger.sql', 'utf8');
    const conditions = [...source.matchAll(/^\s*if\s+(.+?)\s+then raise exception 'Valid authenticated session required\.'/gm)].map(m => m[1]);
    const guards = [];
    for (const condition of conditions) {
      const expression = condition.replaceAll('u is null', 'false').replaceAll('prism_private.session_allowed()', '(null::boolean)');
      guards.push({ condition, ...(await db.query(`select (${expression}) as rejection_condition, case when ${expression} then 'reject' else 'continue' end as branch`)).rows[0] });
    }
    cases.push({ name: 'verified MFA factor with missing aal must fail closed in both definer guards', pass: guards.length === 2 && guards.every(g => g.branch === 'reject'), observed: { helper, guards } });
  } finally { await db.close(); }
}
{
  const f = structuredClone(original), repayment = f.debt_repayments.find(r => r.transaction_id);
  const tx = f.transactions.find(t => t.id === repayment.transaction_id);
  tx.transaction_date = '2000-02-03T00:00:00.000100Z';
  repayment.paid_at = '2000-02-03T00:00:00.000900Z';
  const t = translateHistory(f), r = reconcileHistory(f, t);
  cases.push({ name: 'distinct microsecond repayment/transaction instants must not pass the identical-instant link rule', pass: t.exceptions.some(e => e.code === 'ambiguous_or_missing_transaction_link') && !r.accepted, observed: { transactionInstant: tx.transaction_date, repaymentInstant: repayment.paid_at, exceptions: t.exceptions, accepted: r.accepted } });
}
{
  const f = structuredClone(original), cash = f.accounts[0], tx = f.transactions[0];
  f.approved_opening_at[cash.id] = '2000-02-01T00:00:00.000900Z';
  tx.transaction_date = '2000-02-01T00:00:00.000100Z';
  const t = translateHistory(f), r = reconcileHistory(f, t);
  cases.push({ name: 'activity 800 microseconds before its approved opening must be an exception', pass: t.exceptions.some(e => e.code === 'activity_before_approved_opening') && !r.accepted, observed: { openingInstant: f.approved_opening_at[cash.id], activityInstant: tx.transaction_date, exceptions: t.exceptions, accepted: r.accepted } });
}
await mkdir('artifacts/phase2', { recursive: true });
await writeFile('artifacts/phase2/final-review-probes.json', JSON.stringify({ mode: 'offline-synthetic-review', cases }, null, 2) + '\n');
for (const c of cases) console.log(`${c.pass ? 'PASS' : 'FAIL'} ${c.name}: ${JSON.stringify(c.observed)}`);
if (cases.some(c => !c.pass)) process.exitCode = 1;
