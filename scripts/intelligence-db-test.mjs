import { financialClaims } from './lib/financial-test-identity.mjs';
import { PGlite } from '@electric-sql/pglite';
import { replay } from './foundations-db-test.mjs';
import { buildIntelligence } from '../src/domain/intelligence.ts';
import { resolveFinancialPeriod } from '../src/domain/periods.ts';
import { accountingReport, buildPosting } from '../src/domain/accounting.ts';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { mkdir, writeFile, mkdtemp } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import EmbeddedPostgres from 'embedded-postgres';
import pg from 'pg';

// Fresh WASM PostgreSQL only. No environment URL/key or hosted connection.
const native = process.argv.includes('--native'), checks = [], costs = [];
let db;
if (native) {
  const directory = await mkdtemp(join(tmpdir(),'prism-intelligence-'));
  const port = await new Promise(done => { const socket=createServer();socket.listen(0,'127.0.0.1',()=>{const port=socket.address().port;socket.close(()=>done(port));}); });
  const server = new EmbeddedPostgres({databaseDir:join(directory,'data'),user:'postgres',password:randomUUID(),port,persistent:true,onLog:()=>{},onError:()=>{}});
  if (process.platform==='win32') server.stop=async()=>{
    if (!server.process) return;
    await new Promise((done,reject)=>{const child=spawn(resolve('node_modules/@embedded-postgres/windows-x64/native/bin/pg_ctl.exe'),['-D',join(directory,'data'),'-m','fast','-w','stop'],{stdio:'ignore',windowsHide:true});child.once('error',reject);child.once('exit',code=>code===0?done():reject(new Error('Local cluster stop failed')));});server.process=undefined;
  };
  pg.types.setTypeParser(1184,value=>value);pg.types.setTypeParser(1082,value=>value);
  try { await server.initialise();await server.start(); } catch(error) { await server.stop();throw error; }
  const client=server.getPgClient('postgres','127.0.0.1');await client.connect();
  db={exec:sql=>client.query(sql),query:(sql,args)=>client.query(sql,args),close:async()=>{await client.end();await server.stop();}};
} else db=new PGlite();
const check = name => { checks.push(name); console.log('PASS ' + name); };
try {
  await replay(db);
  const user = randomUUID(), other = randomUUID(), session = randomUUID(), otherSession = randomUUID();
  await db.query('insert into auth.users(id) values($1),($2)', [user, other]);
  await db.query('insert into auth.sessions(id,user_id) values($1,$2),($3,$4)', [session, user, otherSession, other]);
  const identity = async (id, sid, aal='aal2') => { await db.exec('reset role'); await db.query("select set_config('request.jwt.claims',$1,false)", [JSON.stringify(await financialClaims(db,{ sub: id, session_id: sid, aal }))]); await db.exec('set role authenticated'); };
  await identity(user, session);
  const now = Date.now(), today = new Date(now).toISOString().slice(0, 10), month = today.slice(0, 7);
  await db.query("update public.profiles set financial_timezone='UTC' where id=auth.uid()");
  const createAccount = async name => (await db.query("insert into public.accounts(user_id,name,currency,opening_balance) values(auth.uid(),$1,'MYR','1000.00') returning id", [name])).rows[0].id;
  const main = await createAccount('Main'), savings = await createAccount('Savings');
  await db.query("insert into public.transactions(user_id,account_id,amount,currency,type,description,transaction_date) values(auth.uid(),$1,'5000.00','MYR','income','Salary',$2),(auth.uid(),$1,'3000.00','MYR','expense','Ordinary spending',$2),(auth.uid(),$1,'999.00','MYR','expense','Future rent','2099-01-01')", [main, today]);
  await db.query("insert into public.transfers(user_id,source_account_id,destination_account_id,source_currency,destination_currency,source_amount,destination_amount,occurred_at) values(auth.uid(),$1,$2,'MYR','MYR','1000.00','1000.00',$3)", [main, savings, today]);
  const debt = (await db.query("insert into public.person_debts(user_id,direction,counterparty,original_amount,currency) values(auth.uid(),'i_owe','Synthetic loan','2000.00','MYR') returning id")).rows[0].id;
  await db.query("insert into public.debt_repayments(user_id,debt_id,currency,amount,account_id,paid_at) values(auth.uid(),$1,'MYR','500.00',$2,$3)", [debt, main, today]);
  const input = async () => ({ userId: user, now, timezone: 'UTC', period: resolveFinancialPeriod({ type: 'month', month }, 'UTC', new Date(now)),
    totals: (await db.query('select * from public.finance_daily_totals')).rows,
    accounts: (await db.query('select * from public.exact_accounts')).rows,
    debts: (await db.query('select * from public.exact_person_debts')).rows,
    repayments: (await db.query('select * from public.exact_debt_repayments')).rows,
    goals: [], contributions: [], transfers: [], rules: [], budgets: [], goalPlans: [], debtPlans: [], categories: [] });
  const output = buildIntelligence(await input()).native[0];
  assert.equal(output.income, '5000.00'); assert.equal(output.expense, '3000.00'); assert.equal(output.surplusRate, 40);
  assert.equal(output.balance, '3500.00'); assert.equal(output.debt, '1500.00'); assert.equal(output.recordedRepayments, '500.00');
  assert.equal(output.balance, (await db.query("select sum(balance::numeric)::text as amount from public.exact_accounts")).rows[0].amount);
  check('required salary/expense/own-transfer/principal fixture reconciles exact SQL and intelligence; future rent excluded');
  const ledgerAccounts = [ ['main','asset'], ['savings','asset'], ['loan','liability'], ['opening','equity'], ['salary','income'], ['spending','expense'] ].map(([id, classification]) => ({ id, code: id, currency: 'MYR', classification }));
  const base = { currency: 'MYR', occurred_at: today + 'T00:00:00Z' };
  const actions = [
    { kind:'opening',account:'main',equity:'opening',amount:'1000.00',classification:'asset' },
    { kind:'opening',account:'savings',equity:'opening',amount:'1000.00',classification:'asset' },
    { kind:'opening',account:'loan',equity:'opening',amount:'2000.00',classification:'liability' },
    { kind:'salary',cash:'main',income:'salary',amount:'5000.00' },
    { kind:'expense',cash:'main',expense:'spending',amount:'3000.00' },
    { kind:'transfer',source:'main',destination:'savings',amount:'1000.00' },
    { kind:'loan_payment',cash:'main',liability:'loan',interestExpense:'spending',principal:'500.00',interest:'0.00' },
  ];
  const events = actions.map((action, i) => ({ ...buildPosting({ ...base, request_key: `synthetic-${i}` }, action), id: String(i), financial_date: today }));
  const lines = events.flatMap(e => (e.lines ?? []).map(l => ({ ...l, event_id: e.id, currency: e.currency, financial_date: e.financial_date, classification: ledgerAccounts.find(a => a.id === l.account_id).classification })));
  const ledger = accountingReport(ledgerAccounts, lines, 'MYR', month+'-01', today);
  assert.equal(ledger.assets, output.balance); assert.equal(ledger.liabilities, output.debt); assert.equal(ledger.income, output.income); assert.equal(ledger.expenses, output.expense); assert.equal(ledger.equationDifference, '0.00');
  check('independently constructed balanced fixture reconciles ledger stocks and flows at zero tolerance without live ledger cutover');
  await db.query("update public.transactions set amount='2999.90' where description='Ordinary spending'");
  assert.equal(buildIntelligence(await input()).native[0].expense, '2999.90');
  check('legacy source edits restate report amounts by exact ten cents');
  await db.query("insert into public.transactions(user_id,amount,currency,type,description,transaction_date) select auth.uid(),'0.10','MYR','expense','Synthetic load', $1::date - (s % 180) from generate_series(1,5000) s", [today]);
  for (const sample of [1,2,3]) {
    const started = performance.now();
    const plan = (await db.query("explain (analyze,buffers,format json) select * from public.finance_daily_totals where user_id=auth.uid() and financial_date between $1::text and $2::text order by financial_date,currency,type,category_id limit 1000", [month+'-01',today])).rows;
    costs.push({sample,rows:5003,wallMs:performance.now()-started,plan});
  }
  check('three query-plan samples on 5,003 synthetic transactions recorded; no speculative snapshots/index changes');
  await identity(other, otherSession);
  for (const view of ['finance_daily_totals','exact_accounts','exact_debt_repayments']) assert.equal((await db.query(`select * from public.${view}`)).rows.length,0);
  await identity(user,randomUUID()); assert.equal((await db.query('select * from public.finance_daily_totals')).rows.length,0);
  await db.exec('reset role'); await db.query("insert into auth.mfa_factors values($1,$2,'verified')", [randomUUID(),user]); await identity(user,session,'aal1');
  assert.equal((await db.query('select * from public.finance_daily_totals')).rows.length,0);
  await identity(user,session,'aal2'); assert((await db.query('select * from public.finance_daily_totals')).rows.length>0);
  await db.exec('reset role; set role anon'); await assert.rejects(db.query('select * from public.finance_daily_totals'));
  check('new source reads retain actual owner/session/MFA/anonymous SQL boundaries');
  await mkdir('artifacts/phase6',{recursive:true});
  await writeFile(`artifacts/phase6/sql-reconciliation${native?'-native':''}.json`,JSON.stringify({environment:native?'isolated native PostgreSQL; synthetic only':'isolated PGlite; synthetic only',checks,output,ledger,costs},null,2));
} finally { await db.close(); }
