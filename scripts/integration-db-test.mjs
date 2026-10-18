import { financialClaims } from './lib/financial-test-identity.mjs';
import EmbeddedPostgres from 'embedded-postgres';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { budgetBalances } from '../src/domain/planning.ts';
import { accountingReport } from '../src/domain/accounting.ts';
import { translateHistory, reconcileHistory, materializeFixture } from '../src/domain/ledger-reconciliation.ts';
import { planningHighlights } from '../src/domain/planning-highlights.ts';
import { exerciseLedger, exerciseHistoricalLedger, exerciseLedgerBoundaries } from './ledger-db-test.mjs';

// Only fresh native databases on loopback, synthetic inputs and random passwords.
// The receipt map below is a test oracle, not a hosted migration history repair.
const files = (await readdir('supabase/migrations')).filter(f => f.endsWith('.sql')).sort();
assert.equal(files.length, 19, 'Review any change to the accepted migration chain');
assert.equal(new Set(files.map(f => f.split('_')[0])).size, files.length);
const audit = JSON.parse(await readFile('docs/phases1-4-audit-evidence.json', 'utf8'));
const phase5 = JSON.parse(await readFile('docs/phase5-migration-inventory.json','utf8'));
const repairs = JSON.parse(await readFile('docs/release-validation/production-migration-repairs.json', 'utf8'));
const security = JSON.parse(await readFile('docs/security/mandatory-mfa-migration.json','utf8'));
const migrations = [];
for (const file of files) {
  const sql = await readFile(`supabase/migrations/${file}`, 'utf8');
  const hash = createHash('sha256').update(sql.replaceAll('\r\n', '\n')).digest('hex').toUpperCase();
  const expected = audit.normalizedMigrationContent.find(m => m.file === file && m.phase === 'phase1') ?? audit.normalizedMigrationContent.find(m => m.file === file) ?? phase5.migrations.find(m => m.file === file) ?? repairs.migrations.find(m => m.file === file) ?? security.migrations.find(m => m.file === file);
  assert(expected, `Unreviewed migration: ${file}`);
  assert.equal(hash, expected.normalizedSha256, `Accepted SQL bytes changed: ${file}`);
  migrations.push({ file, sql, hash });
}
const bootstrap = (await readFile('supabase/tests/auth-fixture.sql', 'utf8')).replace(/^create role .+;\r?\n/gm, '');
const directory = await mkdtemp(join(tmpdir(), 'prism-integration-'));
const port = await new Promise(done => { const listener = createServer(); listener.listen(0, '127.0.0.1', () => { const value = listener.address().port; listener.close(() => done(value)); }); });
const server = new EmbeddedPostgres({ databaseDir: join(directory, 'data'), user: 'postgres', password: randomUUID(), port, persistent: true, onLog: () => {}, onError: () => {} });
if (process.platform === 'win32') server.stop = async () => {
  if (!server.process) return;
  if (server.process.exitCode === null) await new Promise((done, reject) => {
    const child = spawn(resolve('node_modules/@embedded-postgres/windows-x64/native/bin/pg_ctl.exe'), ['-D', join(directory, 'data'), '-m', 'fast', '-w', 'stop'], { stdio: 'ignore', windowsHide: true });
    child.on('error', reject); child.on('exit', code => code === 0 ? done() : reject(new Error(`pg_ctl stop: ${code}`)));
  });
  server.process = undefined;
};
const clients = [], results = { environment: 'isolated native PostgreSQL; synthetic data only', chain: migrations.map(({ file, hash }) => ({ file, hash })), checks: [], recovery: [], reconciliation: [] };
const check = name => { results.checks.push(name); console.log(`PASS ${name}`); };
const catalogue = async db => (await db.query(`select jsonb_build_object(
 'schemas',(select jsonb_agg(jsonb_build_array(nspname,nspacl) order by nspname) from pg_namespace where nspname in ('public','prism_private')),
 'defaultPrivileges',(select jsonb_agg(jsonb_build_array(pg_get_userbyid(defaclrole),defaclobjtype,defaclacl) order by defaclrole,defaclobjtype) from pg_default_acl),
 'relations',(select jsonb_agg(jsonb_build_array(n.nspname,c.relname,c.relkind,c.relrowsecurity,c.relforcerowsecurity,c.reloptions,c.relacl) order by n.nspname,c.relname) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','prism_private')),
 'columns',(select jsonb_agg(jsonb_build_array(table_schema,table_name,column_name,data_type,is_nullable,column_default) order by table_schema,table_name,ordinal_position) from information_schema.columns where table_schema in ('public','prism_private')),
 'functions',(select jsonb_agg(jsonb_build_array(n.nspname,p.proname,pg_get_function_identity_arguments(p.oid),pg_get_functiondef(p.oid),p.proacl,pg_get_userbyid(p.proowner)) order by n.nspname,p.proname,pg_get_function_identity_arguments(p.oid)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','prism_private') and p.prokind='f'),
 'policies',(select jsonb_agg(to_jsonb(p) order by schemaname,tablename,policyname) from pg_policies p where schemaname='public'),
 'constraints',(select jsonb_agg(jsonb_build_array(n.nspname,c.relname,k.conname,pg_get_constraintdef(k.oid)) order by n.nspname,c.relname,k.conname) from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','prism_private')),
 'triggers',(select jsonb_agg(pg_get_triggerdef(t.oid) order by c.relname,t.tgname) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where not t.tgisinternal and n.nspname in ('public','prism_private')),
 'views',(select jsonb_agg(to_jsonb(v) order by schemaname,viewname) from pg_views v where schemaname='public')
 )::text as snapshot`)).rows[0].snapshot;
const legacyTables = ['profiles','categories','payment_methods','transactions','accounts','objectives','objective_contributions','objective_milestones','person_debts','debt_repayments','transfers','monthly_budgets','recurring_rules'];
const snapshot = async db => {
  const result = {};
  for (const table of legacyTables) result[table] = (await db.query(`select coalesce(jsonb_agg(to_jsonb(t) - 'rollover_enabled' - 'alert_percent' order by id),'[]'::jsonb)::text as records from public.${table} t`)).rows[0].records;
  result.cash = (await db.query("select coalesce(jsonb_agg(to_jsonb(t) order by id),'[]'::jsonb)::text as records from public.exact_accounts t")).rows[0].records;
  return result;
};
const receipts = new WeakMap();
const apply = async (db, migration) => {
  const history = receipts.get(db);
  const accepted = migrations.find(m => m.file === migration.file);
  assert(accepted, 'Unreviewed migration history');
  assert.equal(migration.hash, accepted.hash, 'Incompatible migration hash');
  assert.equal(createHash('sha256').update(migration.sql.replaceAll('\r\n','\n')).digest('hex').toUpperCase(), accepted.hash, 'Incompatible migration content');
  assert(!history.has(migration.file), 'Duplicate or ambiguous migration history');
  assert.equal(migration.file, files[history.size], 'Out-of-order migration history');
  await db.query(migration.sql); history.set(migration.file, migration.hash);
};
try {
  await server.initialise(); await server.start();
  const admin = server.getPgClient('postgres', '127.0.0.1'); await admin.connect(); clients.push(admin);
  await admin.query('create role anon; create role authenticated; create role service_role bypassrls; create role supabase_auth_admin');
  const connect = async name => { await admin.query(`create database ${name}`); const db = server.getPgClient(name, '127.0.0.1'); await db.connect(); clients.push(db); await db.query(bootstrap); receipts.set(db, new Map()); return db; };
  const clean = await connect('integration_clean');
  await assert.rejects(apply(clean,migrations[1]), /Out-of-order migration history/);
  for (const migration of migrations) await apply(clean, migration);
  check('clean installation replays all 16 baseline migrations plus the reviewed Phase 5 migration');
  const upgraded = await connect('integration_upgrade');
  for (const migration of migrations.slice(0, 13)) await apply(upgraded, migration);
  const user = randomUUID(), session = randomUUID();
  await upgraded.query('insert into auth.users(id) values($1)', [user]);
  await upgraded.query('insert into auth.sessions(id,user_id) values($1,$2)', [session,user]);
  const identity = async () => { await upgraded.query('reset role'); await upgraded.query("select set_config('request.jwt.claims',$1,false)", [JSON.stringify(await financialClaims(upgraded,{ sub:user,session_id:session,aal:'aal2' }))]); await upgraded.query('set role authenticated'); };
  await identity();
  await upgraded.query("update public.profiles set currency='JPY',language='ms',financial_timezone='Asia/Tokyo' where id=auth.uid()");
  for (const currency of ['MYR','USD','EUR','JPY']) await upgraded.query('insert into public.accounts(user_id,name,currency,opening_balance) values(auth.uid(),$1,$1,$2)', [currency,currency==='JPY'?'9007199254740993':'90071992547409.93']);
  const account = (await upgraded.query("select id from public.accounts where currency='MYR'")).rows[0].id;
  const category = (await upgraded.query("insert into public.categories(user_id,name,type,color) values(auth.uid(),'Food','expense','#123456') returning id")).rows[0].id;
  for (const [month,amount] of [['2000-09','700.00'],['2000-10','850.00']]) {
    await upgraded.query('insert into public.monthly_budgets(user_id,category_id,currency,month,amount) values(auth.uid(),$1,\'MYR\',$2,800)', [category,`${month}-01`]);
    await upgraded.query("insert into public.transactions(user_id,type,currency,category_id,account_id,amount,transaction_date) values(auth.uid(),'expense','MYR',$1,$2,$3,$4)", [category,account,amount,`${month}-02T00:00:00.000001Z`]);
  }
  const debt = (await upgraded.query("insert into public.person_debts(user_id,direction,counterparty,currency,original_amount) values(auth.uid(),'i_owe','Synthetic loan','MYR',1000) returning id")).rows[0].id;
  await upgraded.query("insert into public.debt_repayments(user_id,debt_id,currency,amount,account_id,paid_at) values(auth.uid(),$1,'MYR',100,$2,'2000-09-02T00:00:00Z')", [debt,account]);
  await upgraded.query("insert into public.payment_methods(user_id,name,type) values(auth.uid(),'Synthetic cash','cash')");
  const savings = (await upgraded.query("insert into public.accounts(user_id,name,currency,opening_balance) values(auth.uid(),'Synthetic savings','MYR',0) returning id")).rows[0].id;
  const goal = (await upgraded.query("insert into public.objectives(user_id,kind,name,currency,target_amount) values(auth.uid(),'savings','Synthetic reserve','MYR',1000) returning id")).rows[0].id;
  await upgraded.query("insert into public.objective_milestones(user_id,objective_id,name,amount) values(auth.uid(),$1,'Synthetic milestone',100)",[goal]);
  await upgraded.query("insert into public.objective_contributions(user_id,objective_id,currency,amount,account_id,contributed_at) values(auth.uid(),$1,'MYR',20,$2,'2000-09-02T00:00:00Z')",[goal,account]);
  await upgraded.query("insert into public.transfers(user_id,source_account_id,destination_account_id,source_currency,destination_currency,source_amount,destination_amount,occurred_at) values(auth.uid(),$1,$2,'MYR','MYR',30,30,'2000-09-02T00:00:00Z')",[account,savings]);
  await upgraded.query("insert into public.recurring_rules(user_id,description,currency,type,start_date,frequency,amount) values(auth.uid(),'Synthetic forecast','MYR','expense','2000-09-01','monthly',25)");
  const baseline = await snapshot(upgraded);
  await upgraded.query('reset role');
  for (const migration of migrations.slice(13)) {
    const before = await catalogue(upgraded);
    assert.match(migration.sql, /commit;\s*$/i, 'Recovery probe requires an explicit transactional migration');
    const faulty = migration.sql.replace(/commit;\s*$/i, 'select 1/0; commit;');
    await assert.rejects(upgraded.query(faulty), error => error.code === '22012');
    await upgraded.query('rollback');
    assert.equal(await catalogue(upgraded), before, 'Failed migration must roll back its whole catalogue');
    assert.deepEqual(await snapshot(upgraded), baseline, 'Failed migration must preserve canonical exact financial rows');
    await apply(upgraded, migration);
    assert.deepEqual(await snapshot(upgraded), baseline, 'Recovered upgrade must preserve all legacy records and cash');
    results.recovery.push({ file:migration.file, injectedFailure:'22012 before commit', catalogueRolledBack:true, all13LegacyTablesPreserved:true, exactCashPreserved:true, successfulRetry:true });
  }
  assert.equal(await catalogue(upgraded), await catalogue(clean), 'Clean and upgraded catalogues must agree');
  await assert.rejects(apply(upgraded,migrations[15]), /Duplicate or ambiguous/);
  await assert.rejects(apply(clean,{...migrations[15],file:'20990101000000_unknown.sql'}), /Unreviewed/);
  await assert.rejects(apply(upgraded,{...migrations[15],hash:'changed-hash'}), /Incompatible migration hash/);
  await assert.rejects(apply(upgraded,{...migrations[15],sql:migrations[15].sql+'select 1;'}), /Incompatible migration content/);
  check('Phase 1 upgrade preserves exact financial rows; four injected DDL failures roll back and recover; clean/upgrade catalogues agree; incompatible receipts denied');
  await identity();
  const at = column => `to_char(${column} at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;
  const read = async (table,columns) => (await upgraded.query(`select ${columns} from public.${table} where user_id=auth.uid() order by id`)).rows;
  const historical = {
    fixture_kind:'synthetic',user_id:user,timezone:'Asia/Tokyo',cutoff:'2000-10-31T23:59:59.999999Z',
    accounts:await read('exact_accounts','id,user_id,currency,opening_balance'),
    transactions:await read('exact_transactions',`id,user_id,currency,amount,type,account_id,${at('transaction_date')} as transaction_date`),
    person_debts:await read('exact_person_debts','id,user_id,currency,direction,original_amount'),
    transfers:await read('exact_transfers',`id,user_id,source_account_id,destination_account_id,source_currency,destination_currency,source_amount,destination_amount,${at('occurred_at')} as occurred_at`),
    debt_repayments:await read('exact_debt_repayments',`id,user_id,currency,debt_id,amount,transaction_id,account_id,${at('paid_at')} as paid_at`),
    objective_contributions:await read('exact_objective_contributions',`id,user_id,currency,objective_id,amount,transaction_id,account_id,transfer_id,${at('contributed_at')} as contributed_at`),
    objectives:await read('objectives','id,user_id,currency'),
  };
  historical.approved_opening_at=Object.fromEntries(historical.accounts.map(a=>[a.id,'2000-01-01T00:00:00.000000Z']));
  historical.approved_debt_opening_at=Object.fromEntries(historical.person_debts.map(d=>[d.id,'2000-01-01T00:00:00.000000Z']));
  const translated=translateHistory(historical), reconciled=reconcileHistory(historical,translated), posted=materializeFixture(translated,historical.timezone);
  assert(reconciled.accepted,JSON.stringify(reconciled.exceptions));
  const nativeCash=(await upgraded.query('select id,currency,balance from public.exact_accounts order by id')).rows;
  for(const record of nativeCash) {
    const report=accountingReport(translated.accounts,posted.lines,record.currency,'2000-01-01','2000-11-01');
    assert.equal(report.balances[`cash:${record.id}`],record.balance,'Independent native legacy cash must match its shadow account exactly');
    assert.match(report.equationDifference,/^0(?:\.0+)?$/);
  }
  const myr=accountingReport(translated.accounts,posted.lines,'MYR','2000-01-01','2000-11-01');
  assert.equal(myr.liabilities,'900.00'); assert.equal(myr.expenses,'1550.00');
  assert.equal((await upgraded.query("select round(original_amount-(select sum(amount) from public.debt_repayments where debt_id=$1),2)::text as outstanding from public.person_debts where id=$1",[debt])).rows[0].outstanding,myr.liabilities);
  results.historicalReconciliation={cutoff:historical.cutoff,openingApprovals:'explicit synthetic dates only',cash:nativeCash,shadowSheets:reconciled.balanceSheets,comparisons:reconciled.comparisons,accepted:true};
  check('existing Phase 1 four-currency cash, transfer, earmark and principal history reconciles with upgraded shadow reports at zero tolerance using independent native SQL');
  await upgraded.query("update public.monthly_budgets set rollover_enabled=true,alert_percent=100 where month='2000-10-01'");
  // Independent SQL monthly totals are the oracle for both JS consumers.
  const readBudgets = async () => (await upgraded.query('select * from public.exact_monthly_budgets order by month')).rows;
  let rows = await readBudgets();
  assert.deepEqual(rows.map(r=>r.spent), ['700.00','850.00']);
  assert.equal(budgetBalances(rows)[1].available,'900.00'); assert.equal(budgetBalances(rows)[1].remaining,'50.00');
  assert.equal(planningHighlights(rows,[],'2000-10-10').alerts.length,0);
  results.reconciliation.push({ scenario:'positive',sqlSpent:rows.map(r=>r.spent),available:'900.00',remaining:'50.00',dashboardReached:false });
  await upgraded.query("update public.transactions set amount=900 where transaction_date<'2000-10-01' and type='expense'");
  await upgraded.query("update public.transactions set amount=750 where transaction_date>='2000-10-01' and type='expense'");
  rows = await readBudgets();
  assert.deepEqual(rows.map(r=>r.spent), ['900.00','750.00']);
  assert.equal(budgetBalances(rows)[1].available,'700.00'); assert.equal(budgetBalances(rows)[1].remaining,'-50.00');
  assert.equal(planningHighlights(rows,[],'2000-10-10').alerts.length,1);
  results.reconciliation.push({ scenario:'negative',sqlSpent:rows.map(r=>r.spent),available:'700.00',remaining:'-50.00',dashboardReached:true });
  const cash = (await upgraded.query('select balance from public.exact_accounts where id=$1',[account])).rows[0].balance;
  await upgraded.query("insert into public.reserve_plans(user_id,month,currency,name,amount) values(auth.uid(),'2000-10-01','MYR','Synthetic reserve',20)");
  assert.equal((await upgraded.query('select balance from public.exact_accounts where id=$1',[account])).rows[0].balance,cash);
  const freshDebt=(await upgraded.query("insert into public.person_debts(user_id,direction,counterparty,currency,original_amount) values(auth.uid(),'i_owe','Synthetic race','MYR',100) returning id")).rows[0].id;
  await upgraded.query('reset role');
  const left=server.getPgClient('integration_upgrade','127.0.0.1'),right=server.getPgClient('integration_upgrade','127.0.0.1');
  clients.push(left,right);await left.connect();await right.connect();
  for(const connection of [left,right]) {await connection.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify(await financialClaims(upgraded,{sub:user,session_id:session,aal:'aal2'}))]);await connection.query('set role authenticated');}
  const rightPid=(await right.query('select pg_backend_pid() as pid')).rows[0].pid;
  await left.query('begin');await right.query('begin');
  await left.query("insert into public.debt_repayments(user_id,debt_id,currency,amount,account_id) values(auth.uid(),$1,'MYR',20,$2)",[freshDebt,account]);
  const recast=right.query('update public.person_debts set original_amount=200 where id=$1',[freshDebt]).then(()=>({accepted:true}),error=>({error}));
  let blocked=false;const deadline=Date.now()+5000;
  while(Date.now()<deadline) {const waiting=(await upgraded.query('select wait_event_type from pg_stat_activity where pid=$1',[rightPid])).rows[0];if(waiting?.wait_event_type==='Lock'){blocked=true;break;}await new Promise(done=>setTimeout(done,10));}
  assert(blocked,'Term recast must visibly wait for the repayment parent lock');
  await left.query('commit');const outcome=await recast;
  assert.match(outcome.error?.message??'',/Historical debt terms require an audited correction/);await right.query('rollback');
  assert.equal((await upgraded.query('select round(original_amount,2)::text as amount from public.person_debts where id=$1',[freshDebt])).rows[0].amount,'100.00');
  assert.equal((await upgraded.query('select count(*)::int as n from public.debt_repayments where debt_id=$1',[freshDebt])).rows[0].n,1);
  results.concurrency={repaymentVersusTermRecast:'observed native lock wait; committed repayment preserved, monetary recast rejected',accepted:true};
  check('Phase 4 debt terms cannot race a committed principal repayment: native lock observed and recast denied');
  const db = { exec:sql=>upgraded.query(sql), query:(sql,args)=>upgraded.query(sql,args) };
  await exerciseLedger(db); await exerciseHistoricalLedger(db); await exerciseLedgerBoundaries(db);
  check('native SQL positive/negative rollover reconciles dashboard and budgeting; reserve saves preserve cash; upgrade retains ledger ownership, exact cutoff and independent historical SQL reconciliation');
  results.accepted = true;
} catch (error) { results.accepted = false; results.failure = error.stack; console.error(error); process.exitCode = 1; }
finally {
  for (const db of clients) await db.end(); await server.stop();
  await mkdir('artifacts/integration',{recursive:true}); await writeFile('artifacts/integration/migration-verification.json',JSON.stringify(results,null,2)+'\n');
}
