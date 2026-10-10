import { PGlite } from '@electric-sql/pglite';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { replay } from './foundations-db-test.mjs';
import { buildPosting, accountingReport } from '../src/domain/accounting.ts';
import { translateHistory, reconcileHistory } from '../src/domain/ledger-reconciliation.ts';

export async function exerciseLedger(db) {
  await db.exec('reset role');
  const user = randomUUID(), session = randomUUID(), other = randomUUID(), otherSession = randomUUID();
  await db.query('insert into auth.users(id) values($1),($2)', [user, other]);
  await db.query('insert into auth.sessions(id,user_id) values($1,$2),($3,$4)', [session, user, otherSession, other]);
  const identity = async (id = user, sid = session, aal = 'aal1') => {
    await db.exec('reset role');
    await db.query("select set_config('request.jwt.claims',$1,false)", [JSON.stringify({ sub: id, session_id: sid, aal })]);
    await db.exec('set role authenticated');
  };
  await identity();
  const create = async (code, classification, currency = 'MYR', mapping = {}) => (await db.query('select public.create_ledger_account($1::jsonb) as id', [JSON.stringify({ code, classification, currency, ...mapping })])).rows[0].id;
  const accounts = { cash: await create('cash', 'asset'), savings: await create('savings', 'asset'), salary: await create('salary', 'income'), food: await create('food', 'expense'), interest: await create('interest', 'expense'), fees: await create('fees', 'expense'), loan: await create('loan', 'liability'), card: await create('card', 'liability'), equity: await create('equity', 'equity') };
  assert.equal(await create('cash', 'asset'), accounts.cash);
  await assert.rejects(create('cash', 'liability'), /identity conflict/);
  const goal = (await db.query("insert into public.objectives(user_id,kind,name,currency,target_amount) values(auth.uid(),'savings','Synthetic ledger goal','MYR','10000.00') returning id")).rows[0].id;
  const base = key => ({ request_key: key, currency: 'MYR', occurred_at: '2000-02-01T00:00:00Z' });
  const post = async p => (await db.query('select public.post_ledger_event($1::jsonb) as id', [JSON.stringify(p)])).rows[0].id;
  const action = (key, a) => buildPosting(base(key), a);
  const salary = action('salary', { kind: 'salary', cash: accounts.cash, income: accounts.salary, amount: '5000' });
  const salaryId = await post(salary); assert.equal(await post(salary), salaryId);
  await assert.rejects(post({ ...salary, lines: salary.lines.map(l => ({ ...l, amount: '5001.00' })) }), /changed payload/);
  const groceryId = await post(action('groceries', { kind: 'expense', cash: accounts.cash, expense: accounts.food, amount: '100' }));
  await post(action('cash-savings', { kind: 'transfer', source: accounts.cash, destination: accounts.savings, amount: '500' }));
  await post(action('loan-open', { kind: 'opening', account: accounts.loan, equity: accounts.equity, classification: 'liability', amount: '1000' }));
  const loanId = await post(action('loan-payment', { kind: 'loan_payment', cash: accounts.cash, liability: accounts.loan, interestExpense: accounts.interest, principal: '480', interest: '120' }));
  assert.deepEqual((await db.query('select code,side,amount from public.exact_ledger_lines where event_id=$1 order by ordinal', [loanId])).rows, [{ code: 'loan', side: 'debit', amount: '480.00' }, { code: 'interest', side: 'debit', amount: '120.00' }, { code: 'cash', side: 'credit', amount: '600.00' }]);
  await post(action('card-purchase', { kind: 'expense', cash: accounts.card, expense: accounts.food, amount: '80' }));
  await post(action('card-settlement', { kind: 'card_settlement', cash: accounts.cash, liability: accounts.card, amount: '80' }));
  await post(action('earmark', { kind: 'goal_earmark', goal_id: goal, amount: '200' }));
  await post(action('funded-goal', { kind: 'goal_transfer', goal_id: goal, source: accounts.cash, destination: accounts.savings, amount: '100' }));
  const refundId = await post(action('refund', { kind: 'refund', cash: accounts.cash, expense: accounts.food, amount: '20' }));
  const reverseId = await post(action('reverse-refund', { kind: 'reversal', reverses_event_id: refundId }));
  assert.equal(await post(action('reverse-refund', { kind: 'reversal', reverses_event_id: refundId })), reverseId);
  await assert.rejects(post(action('second-refund-reversal', { kind: 'reversal', reverses_event_id: refundId })));
  await post(action('reverse-earmark', { kind: 'reversal', reverses_event_id: (await db.query("select id from public.financial_events where request_key='earmark'")).rows[0].id }));
  const fundedId = (await db.query("select id from public.financial_events where request_key='funded-goal'")).rows[0].id;
  await post(action('reverse-funded', { kind: 'reversal', reverses_event_id: fundedId }));
  await post(action('split', { kind: 'split_expense', cash: accounts.cash, splits: [{ expense: accounts.food, amount: '0.10' }, { expense: accounts.fees, amount: '0.20' }] }));
  await post(action('adjustment', { kind: 'adjustment', reason_code: 'fixture_approved', lines: [{ account_id: accounts.cash, side: 'debit', amount: '0.01' }, { account_id: accounts.equity, side: 'credit', amount: '0.01' }] }));
  const nativeAccounts = (await db.query('select id,code,classification,currency from public.ledger_accounts')).rows;
  const lines = (await db.query('select * from public.exact_ledger_lines')).rows;
  const report = accountingReport(nativeAccounts, lines, 'MYR', '2000-02-01', '2000-02-29');
  assert.equal(report.equationDifference, '0.00'); assert.equal(report.expenses, '300.30'); assert.equal(report.income, '5000.00'); assert.equal(report.balances[accounts.loan], '-520.00'); assert.equal(report.balances[accounts.card], '0.00');
  assert.equal((await db.query('select coalesce(sum(amount::numeric),0)::text as n from public.exact_ledger_allocations')).rows[0].n, '0.00');
  assert.equal((await db.query('select count(*)::int as n from public.transactions where user_id=$1', [user])).rows[0].n, 0, 'Shadow postings must not dual-write legacy transactions');
  const count = async () => (await db.query('select count(*)::int as n from public.financial_events where user_id=$1', [user])).rows[0].n;
  const before = await count();
  for (const bad of [
    { ...salary, request_key: 'unbalanced', lines: [{ account_id: accounts.cash, side: 'debit', amount: '10' }, { account_id: accounts.salary, side: 'credit', amount: '9' }] },
    { ...salary, request_key: 'precision', lines: salary.lines.map(l => ({ ...l, amount: '1.001' })) },
    { ...salary, request_key: 'numeric-json', lines: salary.lines.map(l => ({ ...l, amount: 100 })) },
    { ...salary, request_key: 'missing-account', lines: [{ ...salary.lines[0], account_id: randomUUID() }, salary.lines[1]] },
    { ...salary, request_key: 'future', occurred_at: '2999-01-01T00:00:00Z' },
    { ...salary, request_key: 'no-offset', occurred_at: '2000-02-01' },
    ...['2000-02-01T00:00:00.0000001Z', '2000-02-30T00:00:00Z', '2000-02-01T24:00:00Z', '2000-02-01T00:00:60Z', '0000-01-01T00:00:00Z', '2000-02-01T00:00:00+16:00'].map((occurred_at, i) => ({ ...salary, request_key: `bad-instant:${i}`, occurred_at })),
    { ...salary, request_key: 'wrong-action', kind: 'card_settlement' },
    { ...salary, request_key: 'injected-owner', user_id: other },
    { ...salary, request_key: 'scheduled', kind: 'scheduled' },
    { ...salary, request_key: 'invalid-side', lines: salary.lines.map(l => ({ ...l, side: 'other' })) },
    { ...salary, request_key: 'too-many', lines: Array(65).fill(salary.lines[0]) },
    action('overpay-loan', { kind: 'loan_payment', cash: accounts.cash, liability: accounts.loan, interestExpense: accounts.interest, principal: '521', interest: '0' }),
    action('overpay-card', { kind: 'card_settlement', cash: accounts.cash, liability: accounts.card, amount: '1' }),
    { ...action('earmark-invalid', { kind: 'goal_earmark', goal_id: goal, amount: '1' }), lines: salary.lines },
    { ...action('allocation-zero', { kind: 'goal_earmark', goal_id: goal, amount: '1' }), allocation_amount: '0' },
    { ...action('funded-mismatch', { kind: 'goal_transfer', source: accounts.cash, destination: accounts.savings, goal_id: goal, amount: '1' }), allocation_amount: '2' },
  ]) { await assert.rejects(post(bad)); assert.equal(await count(), before, 'Failed posting leaves no event'); }
  for (const currency of ['USD', 'EUR', 'JPY']) {
    const cash = await create(`cash:${currency}`, 'asset', currency), income = await create(`income:${currency}`, 'income', currency);
    const p = buildPosting({ ...base(`salary:${currency}`), currency }, { kind: 'salary', cash, income, amount: currency === 'JPY' ? '9007199254740993' : '90071992547409.93' });
    const id = await post(p); assert.equal((await db.query('select amount from public.exact_ledger_lines where event_id=$1 order by ordinal', [id])).rows[0].amount, currency === 'JPY' ? '9007199254740993' : '90071992547409.93');
    await assert.rejects(post({ ...salary, request_key: `mixed:${currency}`, lines: [{ ...salary.lines[0], account_id: cash }, salary.lines[1]] }));
  }
  const overdraft=await create('signed-overdraft','asset');
  await post(action('negative-opening',{kind:'opening',account:overdraft,equity:accounts.equity,classification:'asset',amount:'-1.00'}));
  await post(action('permitted-overdraft',{kind:'expense',cash:overdraft,expense:accounts.food,amount:'1.00'}));
  assert.equal((await db.query("select sum(case when side='debit' then amount else -amount end)::text as balance from public.journal_lines where account_id=$1",[overdraft])).rows[0].balance,'-2.00');
  await identity(other, otherSession);
  assert.equal((await db.query('select count(*)::int as n from public.exact_ledger_lines')).rows[0].n, 0);
  assert.equal((await db.query('select count(*)::int as n from public.financial_events')).rows[0].n, 0);
  await assert.rejects(post({ ...salary, request_key: 'cross-owner' }));
  await identity(user, randomUUID()); await assert.rejects(post({ ...salary, request_key: 'bad-session' }), /session required/);
  assert.equal((await db.query('select count(*)::int as n from public.exact_ledger_lines')).rows[0].n, 0);
  await db.exec('reset role');const expiredSession=randomUUID();await db.query("insert into auth.sessions(id,user_id,not_after) values($1,$2,now()-interval '1 hour')",[expiredSession,user]);
  await identity(user,expiredSession);await assert.rejects(post({...salary,request_key:'expired-session'}),/session required/);
  assert.equal((await db.query('select count(*)::int as n from public.exact_ledger_lines')).rows[0].n,0);
  await identity(other,session);await assert.rejects(post({...salary,request_key:'wrong-session-owner'}),/session required/);
  await db.exec('reset role');await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:user,session_id:session,aal:'aal1',is_anonymous:true})]);await db.exec('set role authenticated');
  await assert.rejects(post({...salary,request_key:'anonymous-signin'}),/session required/);assert.equal((await db.query('select count(*)::int as n from public.exact_ledger_lines')).rows[0].n,0);
  await db.exec('reset role'); await db.query("insert into auth.mfa_factors(id,user_id,status) values($1,$2,'verified')", [randomUUID(), user]);
  // Missing/null AAL yields SQL NULL in the dependency's session helper.
  // Both SECURITY DEFINER entry points must reject it before any write.
  const snapshot = async () => {
    await db.exec('reset role');
    return (await db.query(`select
      (select count(*)::int from public.ledger_accounts) as accounts,
      (select count(*)::int from public.financial_events) as events,
      (select count(*)::int from public.journals) as journals,
      (select count(*)::int from public.journal_lines) as lines,
      (select count(*)::int from public.ledger_allocations) as allocations,
      (select count(*)::int from public.transactions) as legacy`)).rows[0];
  };
  const sealed = await snapshot();
  for (const [label, claims, allowed] of [
    ['missing-aal', { sub: user, session_id: session }, null],
    ['null-aal', { sub: user, session_id: session, aal: null }, null],
    ['missing-session', { sub: user, aal: 'aal2' }, false],
    ['invalid-session', { sub: user, session_id: randomUUID(), aal: 'aal2' }, false],
    ['wrong-owner', { sub: user, session_id: otherSession, aal: 'aal2' }, false],
    ['insufficient-mfa', { sub: user, session_id: session, aal: 'aal1' }, false],
    ['missing-user', { session_id: session, aal: 'aal2' }, false],
    ['empty-claims', {}, false],
    ['invalid-assurance', { sub: user, session_id: session, aal: 'aal3' }, false],
  ]) {
    for (const operation of ['create', 'post']) {
      await db.query("select set_config('request.jwt.claims',$1,false)", [JSON.stringify(claims)]);
      await db.exec('set role authenticated');
      assert.equal((await db.query('select prism_private.session_allowed() as allowed')).rows[0].allowed, allowed);
      assert.equal((await db.query('select count(*)::int as n from public.exact_ledger_lines')).rows[0].n, 0, label);
      await db.exec('begin; savepoint denied_write');
      await assert.rejects(operation === 'create' ? create(`denied:${label}`, 'asset') : post({ ...salary, request_key: `denied:${label}` }), e => e.code === '42501', `${operation}: ${label}`);
      await db.exec('rollback to savepoint denied_write; commit');
      assert.deepEqual(await snapshot(), sealed, `${operation}: ${label} must leave every table unchanged`);
    }
  }
  await identity(); await assert.rejects(post({ ...salary, request_key: 'mfa-denied' }), /session required/);
  await identity(user, session, 'aal2'); assert.equal(await post(salary), salaryId);
  assert.equal((await db.query('select prism_private.session_allowed() as allowed')).rows[0].allowed, true);
  assert.ok(await create('explicit-true', 'asset'));
  assert.ok(await post({ ...salary, request_key: 'explicit-true', lines: salary.lines.map(l => ({ ...l, amount: '0.01' })) }));
  await db.query("update public.profiles set financial_timezone='UTC' where id=auth.uid()");
  assert.equal((await db.query('select financial_timezone,financial_date::text from public.financial_events where id=$1',[salaryId])).rows[0].financial_timezone,'Asia/Kuala_Lumpur');
  await assert.rejects(db.query('delete from public.financial_events where id=$1', [salaryId]));
  await assert.rejects(db.query('update public.ledger_accounts set classification=$1 where id=$2', ['liability', accounts.cash]));
  await assert.rejects(db.query("insert into public.financial_events(user_id,request_key,request_payload,kind,currency,occurred_at,financial_timezone,financial_date) values(auth.uid(),'direct','{}','salary','MYR','2000-01-01','UTC','2000-01-01')"));
  await db.exec('reset role');
  await assert.rejects(db.query('update public.journal_lines set amount=amount+1 where journal_id=(select id from public.journals where event_id=$1)', [groceryId]), /immutable/);
  const journal = (await db.query('select id from public.journals where event_id=$1', [salaryId])).rows[0].id;
  await assert.rejects(db.query("insert into public.journal_lines(user_id,journal_id,account_id,currency,side,amount,ordinal) values($1,$2,$3,'MYR','debit',1,3)", [user, journal, accounts.cash]), /additional/);
  await db.exec('begin');
  await db.query("insert into public.financial_events(user_id,request_key,request_payload,kind,currency,occurred_at,financial_timezone,financial_date) values($1,'incomplete','{}','salary','MYR','2000-01-01','UTC','2000-01-01')", [user]);
  await assert.rejects(db.exec('commit'), /complete journal/); await db.exec('rollback');
  await db.exec('set role anon'); await assert.rejects(db.query('select public.post_ledger_event($1::jsonb)', [JSON.stringify(salary)])); await assert.rejects(db.query('select * from public.exact_ledger_lines'));
  await db.exec('reset role');
  assert.equal((await db.query("select count(*)::int as n from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('post_ledger_event','create_ledger_account') and p.prosecdef")).rows[0].n, 0);
  const functions = (await db.query(`select n.nspname,p.proname,p.prosecdef,
    'search_path=""'=any(p.proconfig) as empty_path,
    has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute,
    has_function_privilege('anon',p.oid,'EXECUTE') as anonymous_execute
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname in ('public','prism_private') and p.proname in
    ('create_ledger_account','post_ledger_event','ledger_complete','ledger_immutable','ledger_insert_only_during_posting')`)).rows;
  assert.equal(functions.length, 7);
  for (const fn of functions) {
    assert.equal(fn.empty_path, true); assert.equal(fn.anonymous_execute, false);
    assert.equal(fn.authenticated_execute, ['create_ledger_account','post_ledger_event'].includes(fn.proname));
    assert.equal(fn.prosecdef, fn.nspname === 'prism_private' && ['create_ledger_account','post_ledger_event'].includes(fn.proname));
  }
  for (const table of ['ledger_accounts','financial_events','journals','journal_lines','ledger_allocations']) {
    const grants = (await db.query(`select relrowsecurity,
      has_table_privilege('authenticated',oid,'INSERT,UPDATE,DELETE,TRUNCATE') as client_write,
      has_table_privilege('anon',oid,'SELECT') as anon_read
      from pg_class where oid=$1::regclass`, [`public.${table}`])).rows[0];
    assert.deepEqual(grants, { relrowsecurity: true, client_write: false, anon_read: false });
  }
  console.log('PASS P1 authorization: TRUE allowed; FALSE/NULL/missing/invalid session/owner/MFA denied in both RPCs; all five ledger tables and legacy transactions unchanged after denied savepoint/commit; RLS/grants/search paths checked');
  console.log('PASS ledger DB: exact mandatory postings, atomic failures, retry conflicts, reversals, four currencies, RLS/session/MFA, exclusive writes and immutable history');
  return { user, session, accounts, goal, salary, salaryId };
}

export async function exerciseHistoricalLedger(db) {
  await db.exec('reset role');
  const f = JSON.parse(await readFile('supabase/tests/ledger-history.synthetic.json', 'utf8'));
  const t = translateHistory(f); assert.equal(reconcileHistory(f, t).accepted, true);
  const session = randomUUID();
  await db.query('insert into auth.users(id) values($1)', [f.user_id]); await db.query('insert into auth.sessions(id,user_id) values($1,$2)', [session, f.user_id]);
  for (const a of f.accounts) await db.query("insert into public.accounts(id,user_id,name,currency,opening_balance) values($1,$2,'Synthetic',$3,$4)", [a.id, a.user_id, a.currency, a.opening_balance]);
  for (const d of f.person_debts) await db.query("insert into public.person_debts(id,user_id,direction,counterparty,currency,original_amount) values($1,$2,$3,'Synthetic',$4,$5)", [d.id, d.user_id, d.direction, d.currency, d.original_amount]);
  for (const g of f.objectives) await db.query("insert into public.objectives(id,user_id,kind,name,currency,target_amount) values($1,$2,'savings','Synthetic',$3,'10000')", [g.id, g.user_id, g.currency]);
  for (const x of f.transactions) await db.query('insert into public.transactions(id,user_id,currency,amount,type,account_id,transaction_date) values($1,$2,$3,$4,$5,$6,$7)', [x.id, x.user_id, x.currency, x.amount, x.type, x.account_id, x.transaction_date]);
  for (const x of f.transfers) await db.query('insert into public.transfers(id,user_id,source_account_id,destination_account_id,source_currency,destination_currency,source_amount,destination_amount,occurred_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9)', [x.id, x.user_id, x.source_account_id, x.destination_account_id, x.source_currency, x.destination_currency, x.source_amount, x.destination_amount, x.occurred_at]);
  for (const x of f.debt_repayments) await db.query('insert into public.debt_repayments(id,user_id,debt_id,currency,amount,transaction_id,account_id,paid_at) values($1,$2,$3,$4,$5,$6,$7,$8)', [x.id, x.user_id, x.debt_id, x.currency, x.amount, x.transaction_id, x.account_id, x.paid_at]);
  for (const x of f.objective_contributions) await db.query('insert into public.objective_contributions(id,user_id,objective_id,currency,amount,transaction_id,account_id,transfer_id,contributed_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9)', [x.id, x.user_id, x.objective_id, x.currency, x.amount, x.transaction_id, x.account_id, x.transfer_id, x.contributed_at]);
  await db.query("update public.profiles set financial_timezone=$1 where id=$2", [f.timezone, f.user_id]);
  await db.query("select set_config('request.jwt.claims',$1,false)", [JSON.stringify({ sub: f.user_id, session_id: session, aal: 'aal1' })]); await db.exec('set role authenticated');
  const ids = new Map();
  for (const a of t.accounts) {
    const legacy_source = a.id.startsWith('cash:') ? 'accounts' : a.id.startsWith('debt:') ? 'person_debts' : undefined;
    const p = { code: a.code, classification: a.classification, currency: a.currency, ...(legacy_source ? { legacy_source, legacy_id: a.id.slice(5) } : {}) };
    ids.set(a.id, (await db.query('select public.create_ledger_account($1::jsonb) as id', [JSON.stringify(p)])).rows[0].id);
  }
  for (const p of t.postings) {
    const request = { ...p, ...(p.lines ? { lines: p.lines.map(l => ({ ...l, account_id: ids.get(l.account_id) })) } : {}) };
    const id = (await db.query('select public.post_ledger_event($1::jsonb) as id', [JSON.stringify(request)])).rows[0].id;
    assert.equal((await db.query('select public.post_ledger_event($1::jsonb) as id', [JSON.stringify(request)])).rows[0].id, id);
  }
  const accounts = (await db.query('select id,code,classification,currency from public.ledger_accounts')).rows;
  const lines = (await db.query('select * from public.exact_ledger_lines')).rows;
  const actual = accountingReport(accounts, lines, 'MYR', '2000-02-01', '2000-02-29');
  for (const row of reconcileHistory(f, t).comparisons.filter(c => c.source === 'accounts')) {
    const expected = (await db.query("select round((a.opening_balance+coalesce((select sum(case when x.type='income' then x.amount else -x.amount end) from public.transactions x where x.account_id=a.id and x.transaction_date<=$2),0)+coalesce((select sum(x.destination_amount) from public.transfers x where x.destination_account_id=a.id and x.occurred_at<=$2),0)-coalesce((select sum(x.source_amount) from public.transfers x where x.source_account_id=a.id and x.occurred_at<=$2),0)+coalesce((select sum(case when d.direction='i_owe' then -r.amount else r.amount end) from public.debt_repayments r join public.person_debts d on d.id=r.debt_id where r.account_id=a.id and r.transaction_id is null and r.paid_at<=$2),0)),2)::text as balance from public.accounts a where id=$1", [row.id, f.cutoff])).rows[0].balance;
    assert.equal(expected, row.actual); assert.equal(actual.balances[ids.get(`cash:${row.id}`)], expected);
  }
  assert.equal(actual.equationDifference, '0.00'); assert.equal(actual.expenses, '220.00'); assert.equal(actual.income, '5000.00');
  const ordinary=(await db.query("select type,sum(amount::numeric)::text as amount from public.exact_transactions where activity_kind='ordinary' and transaction_date<=$1 and financial_date>='2000-02-01' and financial_date<='2000-02-29' group by type",[f.cutoff])).rows;
  assert.equal(ordinary.find(r=>r.type==='income').amount,actual.income);assert.equal(ordinary.find(r=>r.type==='expense').amount,actual.expenses);
  for(const d of f.person_debts){const remaining=(await db.query("select round(d.original_amount-coalesce((select sum(coalesce(r.amount,tx.amount)) from public.debt_repayments r left join public.transactions tx on tx.id=r.transaction_id where r.debt_id=d.id and r.paid_at<=$2),0),2)::text as amount from public.person_debts d where d.id=$1",[d.id,f.cutoff])).rows[0].amount;const balance=actual.balances[ids.get(`debt:${d.id}`)];assert.equal(d.direction==='i_owe'?balance.replace(/^-/,''):balance,remaining);}
  const funding=(await db.query('select sum(effective_amount::numeric)::text as amount from public.exact_objective_contributions where contributed_at<=$1',[f.cutoff])).rows[0].amount;assert.equal(funding,'600.00');
  assert.equal((await db.query("select sum(amount::numeric)::text as n from public.exact_ledger_allocations")).rows[0].n, '600.00');
  await db.exec('reset role'); await db.query('delete from auth.users where id=$1', [f.user_id]);
  for (const table of ['financial_events', 'ledger_accounts', 'journals', 'journal_lines', 'ledger_allocations']) assert.equal((await db.query(`select count(*)::int as n from public.${table} where user_id=$1`, [f.user_id])).rows[0].n, 0, 'Whole-user erasure must preserve the existing contract');
  console.log('PASS ledger history: synthetic translation replays twice, matches independent legacy SQL at cutoff, and confirmed whole-user erasure cascades');
}

export async function exerciseLedgerBoundaries(db) {
  await db.exec('reset role');
  // Execute the exact read-only rehearsal parameter gates, independently of TS.
  const cutoffGuards=(await readFile('scripts/phase2-staging-reconciliation.sql','utf8')).split('-- CASH:')[0]
    .split('\n').filter(l=>!l.trimStart().startsWith('--')&&!l.trimStart().startsWith('\\')).join('\n')
    .split(';').map(q=>q.trim()).filter(q=>/^select\b/i.test(q));
  assert.equal(cutoffGuards.length,2);
  for(const cutoff of ['2000-02-29T15:59:59.000100Z','2000-02-29T23:59:59.000100+08:00']) {
    for(const guard of cutoffGuards) assert.equal(Object.values((await db.query(guard.replaceAll(":'cutoff'",`'${cutoff}'`))).rows[0])[0],1);
  }
  for(const cutoff of ['2000-02-29T15:59:59.0001001Z','2000-02-29T15:59:59.0000000Z','2000-02-30T00:00:00Z','0001-01-01T00:00:00+01:00','2000-02-29T24:00:00Z']) {
    await assert.rejects(async()=>{for(const guard of cutoffGuards) await db.query(guard.replaceAll(":'cutoff'",`'${cutoff}'`));});
  }
  const user = randomUUID(), session = randomUUID(), account = randomUUID();
  const cutoff = '2000-02-29T15:59:59.000100Z';
  const f = { fixture_kind: 'synthetic', user_id: user, timezone: 'Asia/Kuala_Lumpur', cutoff,
    approved_opening_at: {}, approved_debt_opening_at: {},
    accounts: [{ id: account, user_id: user, currency: 'MYR', opening_balance: '0.00' }],
    transactions: [
      ['2.00', '2000-02-29T15:59:59.000099Z'],
      ['3.00', '2000-02-29T23:59:59.000100+08:00'],
      ['7.00', '2000-02-29T15:59:59.000101Z'],
    ].map(([amount, transaction_date]) => ({ id: randomUUID(), user_id: user, currency: 'MYR', type: 'income', account_id: account, amount, transaction_date })),
    transfers: [], person_debts: [], debt_repayments: [], objectives: [], objective_contributions: [] };
  const t = translateHistory(f); assert.equal(t.postings.length, 2); assert.equal(t.deferred.length, 1);
  assert.equal(reconcileHistory(f, t).accepted, true);
  await db.query('insert into auth.users(id) values($1)', [user]);
  await db.query('insert into auth.sessions(id,user_id) values($1,$2)', [session,user]);
  await db.query("insert into public.accounts(id,user_id,name,currency,opening_balance) values($1,$2,'Microsecond boundary','MYR',0)", [account,user]);
  for (const row of f.transactions) await db.query('insert into public.transactions(id,user_id,currency,type,account_id,amount,transaction_date) values($1,$2,$3,$4,$5,$6,$7)', [row.id,user,row.currency,row.type,account,row.amount,row.transaction_date]);
  await db.query("select set_config('request.jwt.claims',$1,false)", [JSON.stringify({sub:user,session_id:session,aal:'aal1'})]); await db.exec('set role authenticated');
  const ids = new Map();
  for (const a of t.accounts) ids.set(a.id, (await db.query('select public.create_ledger_account($1::jsonb) as id', [JSON.stringify({code:a.code,classification:a.classification,currency:a.currency})])).rows[0].id);
  for (const p of t.postings) {
    const request = {...p,lines:p.lines.map(l=>({...l,account_id:ids.get(l.account_id)}))};
    const id = (await db.query('select public.post_ledger_event($1::jsonb) as id', [JSON.stringify(request)])).rows[0].id;
    assert.equal((await db.query('select public.post_ledger_event($1::jsonb) as id', [JSON.stringify(request)])).rows[0].id,id);
  }
  // Independent PostgreSQL oracle compares stored timestamptz, never JS Date.
  const oracle = (await db.query('select sum(amount)::text as total, count(*)::int as n from public.transactions where user_id=$1 and transaction_date<=$2::timestamptz', [user,cutoff])).rows[0];
  assert.deepEqual(oracle, {total:'5.00',n:2});
  assert.equal((await db.query("select sum(amount::numeric)::text as total from public.exact_ledger_lines where classification='income' and side='credit'")).rows[0].total,oracle.total);
  assert.deepEqual((await db.query('select distinct occurred_at from public.exact_ledger_lines order by occurred_at')).rows.map(r=>r.occurred_at), ['2000-02-29T15:59:59.000099Z',cutoff]);
  assert.equal((await db.query('select count(*)::int as n from public.financial_events where occurred_at>$1::timestamptz',[cutoff])).rows[0].n,0);
  // Calendar projection must not silently turn a BC financial date into AD.
  await db.exec('reset role'); await db.query("update public.profiles set financial_timezone='America/New_York' where id=$1",[user]); await db.exec('set role authenticated');
  const first=t.postings[0];
  await assert.rejects(db.query('select public.post_ledger_event($1::jsonb)', [JSON.stringify({...first,request_key:'calendar-out-of-range',occurred_at:'0001-01-01T00:00:00Z',lines:first.lines.map(l=>({...l,account_id:ids.get(l.account_id)}))})]), /Financial calendar date outside supported range/);
  assert.equal((await db.query('select count(*)::int as n from public.financial_events')).rows[0].n,2);
  await db.exec('reset role'); await db.query('delete from auth.users where id=$1',[user]);
  console.log('PASS P1 precision: before/exact/after (1us), offset normalization, exact string DB transport, independent PostgreSQL cutoff oracle and durable deterministic retries');
}

export async function exerciseLedgerConcurrency(admin, a, b, fixture) {
  for (const client of [a, b]) {
    await client.query("select set_config('request.jwt.claims',$1,false)", [JSON.stringify({ sub: fixture.user, session_id: fixture.session, aal: 'aal2' })]); await client.query('set role authenticated'); await client.query("set statement_timeout='10s'");
  }
  const waitForLock = async () => {
    for (let i = 0; i < 100; i++) { if ((await admin.query('select wait_event_type from pg_stat_activity where pid=$1', [b.processID])).rows[0]?.wait_event_type === 'Lock') return; await new Promise(resolve => setTimeout(resolve, 20)); }
    assert.fail('Racing request must wait on a database lock');
  };
  const p = { ...fixture.salary, request_key: 'native-race' };
  await a.query('begin'); const id = (await a.query('select public.post_ledger_event($1::jsonb) as id', [JSON.stringify(p)])).rows[0].id;
  const racing = b.query('select public.post_ledger_event($1::jsonb) as id', [JSON.stringify(p)]); await waitForLock(); await a.query('commit'); assert.equal((await racing).rows[0].id, id);
  assert.equal((await admin.query("select count(*)::int as n from public.financial_events where user_id=$1 and request_key='native-race'", [fixture.user])).rows[0].n, 1);
  await assert.rejects(b.query('select public.post_ledger_event($1::jsonb)', [JSON.stringify({ ...p, occurred_at: '2000-02-02T00:00:00Z' })]), /changed payload/);
  const reverse = buildPosting({ request_key: 'native-reverse-a', currency: 'MYR', occurred_at: '2000-02-03T00:00:00Z' }, { kind: 'reversal', reverses_event_id: id });
  await a.query('begin'); await a.query('select public.post_ledger_event($1::jsonb)', [JSON.stringify(reverse)]);
  const competing = b.query('select public.post_ledger_event($1::jsonb)', [JSON.stringify({ ...reverse, request_key: 'native-reverse-b' })]).then(() => ({ ok: true }), error => ({ ok: false, error }));
  await waitForLock(); await a.query('commit'); assert.equal((await competing).ok, false);
  assert.equal((await admin.query('select count(*)::int as n from public.financial_events where reverses_event_id=$1', [id])).rows[0].n, 1);
  // A lost response before commit leaves no receipt; retry can safely succeed.
  const rolledBack = { ...p, request_key: 'native-rollback' };
  await a.query('begin'); await a.query('select public.post_ledger_event($1::jsonb)', [JSON.stringify(rolledBack)]); await a.query('rollback');
  await b.query('select public.post_ledger_event($1::jsonb)', [JSON.stringify(rolledBack)]);
  assert.equal((await admin.query("select count(*)::int as n from public.financial_events where request_key='native-rollback' and user_id=$1", [fixture.user])).rows[0].n, 1);
  const principal=buildPosting({request_key:'native-principal-a',currency:'MYR',occurred_at:'2000-02-03T00:00:00Z'},{kind:'loan_payment',cash:fixture.accounts.cash,liability:fixture.accounts.loan,interestExpense:fixture.accounts.interest,principal:'400',interest:'0'});
  await a.query('begin');await a.query('select public.post_ledger_event($1::jsonb)',[JSON.stringify(principal)]);
  const overpay=b.query('select public.post_ledger_event($1::jsonb)',[JSON.stringify({...principal,request_key:'native-principal-b'})]).then(()=>({ok:true}),error=>({ok:false,error}));await waitForLock();await a.query('commit');const capped=await overpay;assert.equal(capped.ok,false);assert.match(capped.error.message,/exceeds the posted liability/);
  assert.equal((await admin.query("select count(*)::int as n from public.financial_events where user_id=$1 and request_key='native-principal-b'",[fixture.user])).rows[0].n,0);
  console.log('PASS native ledger: observed lock waits serialize duplicate requests and competing reversals; changed payload fails and aborted request retries safely');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const db = new PGlite();
  try { await replay(db); await exerciseLedger(db); await exerciseHistoricalLedger(db); await exerciseLedgerBoundaries(db); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
  finally { await db.close(); }
}
