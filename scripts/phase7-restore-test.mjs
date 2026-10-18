// Full cold physical snapshot/restore on a disposable native cluster, synthetic only.
// This does not establish managed PostgreSQL 17/PITR or cross-version compatibility.
import EmbeddedPostgres from 'embedded-postgres';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, mkdir, writeFile, cp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { exerciseLedger, exerciseLedgerBoundaries } from './ledger-db-test.mjs';
const directory = await mkdtemp(join(tmpdir(), 'prism-phase7-restore-'));
const sourceDir = join(directory, 'source'), backupDir = join(directory, 'backup'), restoreDir = join(directory, 'restored');
const port = await new Promise(done => { const listener = createServer(); listener.listen(0, '127.0.0.1', () => { const port = listener.address().port; listener.close(() => done(port)); }); });
const password = randomUUID();
function cluster(databaseDir) {
  const server = new EmbeddedPostgres({ databaseDir, user: 'postgres', password, port, persistent: true, onLog: () => {}, onError: () => {} });
  if (process.platform === 'win32') server.stop = async () => {
    if (!server.process) return;
    if (server.process.exitCode === null) await new Promise((done, reject) => {
      const stop = spawn(resolve('node_modules/@embedded-postgres/windows-x64/native/bin/pg_ctl.exe'), ['-D', databaseDir, '-m', 'fast', '-w', 'stop'], { stdio: 'ignore', windowsHide: true });
      stop.on('error', reject); stop.on('exit', code => code === 0 ? done() : reject(new Error('Fixture shutdown failed')));
    }); server.process = undefined;
  };
  return server;
}
async function snapshot(client) {
  await client.query('reset role');
  const tables = (await client.query("select schemaname,tablename from pg_tables where schemaname in ('public','auth','prism_private') order by 1,2")).rows;
  const rows = [];
  for (const table of tables) {
    const quote = identifier => `"${identifier.replaceAll('"', '""')}"`;
    // Keep numeric and timestamp text exactly; never parse financial JSON into numbers.
    const values = (await client.query(`select row_to_json(t)::text as exact from ${quote(table.schemaname)}.${quote(table.tablename)} t order by row_to_json(t)::text`)).rows.map(row => row.exact);
    rows.push({ schema: table.schemaname, table: table.tablename, count: values.length, sha256: createHash('sha256').update(JSON.stringify(values)).digest('hex') });
  }
  return rows;
}
async function seedMfaRecovery(client) {
  const fixture = { user: randomUUID(), session: randomUUID(), factors: [randomUUID(), randomUUID()], replacement: randomUUID() };
  fixture.email = `${fixture.user}@example.test`;
  await client.query('reset role');
  await client.query('insert into auth.users(id,email) values($1,$2)', [fixture.user, fixture.email]);
  // Explicit fake-Auth rows: this proves restored SQL state, never native Auth or custody.
  await client.query("insert into auth.sessions(id,user_id,aal,tag) values($1,$2,'aal2','bare')", [fixture.session, fixture.user]);
  for (const factor of fixture.factors) await client.query("insert into auth.mfa_factors(id,user_id,status) values($1,$2,'verified')", [factor, fixture.user]);
  await client.query("insert into auth.mfa_amr_claims(session_id,authentication_method) values($1,'totp'),($1,'magiclink')", [fixture.session]);
  fixture.claims = {
    sub: fixture.user, session_id: fixture.session, aal: 'aal2', email: fixture.email, is_anonymous: false,
    amr: (await client.query("select authentication_method as method,floor(extract(epoch from updated_at))::bigint::text as timestamp from auth.mfa_amr_claims where session_id=$1 order by authentication_method", [fixture.session])).rows.map(row => ({ ...row, timestamp: Number(row.timestamp) })),
  };
  for (const factor of fixture.factors) {
    await client.query('reset role');
    await client.query('update auth.sessions set factor_id=$1 where id=$2', [factor, fixture.session]);
    await client.query("select set_config('request.jwt.claims',$1,false)", [JSON.stringify(fixture.claims)]);
    await client.query('set role authenticated');
    await client.query('select public.approve_mfa_factor($1,true)', [factor]);
  }
  await client.query('reset role');
  await client.query("insert into prism_private.mfa_management_sessions(session_id,user_id,proof_factor_id,valid_until) values($1,$2,$3,now()-interval '1 minute')", [fixture.session, fixture.user, fixture.factors[0]]);
  await client.query("insert into public.accounts(user_id,name,currency,opening_balance) values($1,'Synthetic restored MFA','MYR','10.01')", [fixture.user]);
  for (const [table, count] of [['approved_mfa_factors', 2], ['mfa_activated_accounts', 1], ['mfa_management_sessions', 1], ['mfa_security_events', 2]]) {
    assert.equal((await client.query(`select count(*)::int as n from prism_private.${table} where user_id=$1`, [fixture.user])).rows[0].n, count, `${table} must contain deliberate recovery fixtures before snapshot`);
  }
  return fixture;
}
async function restoredContainment(client, fixture) {
  const definitions = async () => (await client.query("select p.proname,pg_get_functiondef(p.oid) as definition,p.proacl::text as acl,p.proowner::text as owner from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='prism_private' and p.proname in ('session_allowed','mfa_access_token_hook') order by p.proname")).rows;
  const before = await snapshot(client), originalDefinitions = await definitions();
  assert.equal(originalDefinitions.length, 2);
  const surfaces = (await client.query("select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','v') order by c.relname")).rows;
  assert.equal(surfaces.length, 44, 'Containment must cover the reviewed complete financial table/view catalogue');
  const missingGuards = (await client.query("select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and not exists(select 1 from pg_policies p where p.schemaname='public' and p.tablename=c.relname and p.cmd='ALL' and p.qual like '%session_allowed%' and p.with_check like '%session_allowed%' and 'authenticated'=any(p.roles))")).rows;
  assert.deepEqual(missingGuards, [], 'Empty fixture tables must still have their structural financial guard');
  const savepoint = async work => {
    await client.query('savepoint containment_probe');
    try { await work(); }
    finally { await client.query('rollback to savepoint containment_probe'); await client.query('release savepoint containment_probe'); }
  };
  await client.query('begin');
  try {
    // Disposable restored cluster only. This body is never an operational hosted rollback.
    await client.query("create or replace function prism_private.session_allowed() returns boolean language sql stable security definer set search_path='' as $$ select false $$");
    const containedDefinitions = await definitions();
    assert.deepEqual(containedDefinitions.find(fn => fn.proname === 'mfa_access_token_hook'), originalDefinitions.find(fn => fn.proname === 'mfa_access_token_hook'), 'Financial containment must preserve the native token hook definition and permissions');
    await client.query("select set_config('request.jwt.claims',$1,false)", [JSON.stringify(fixture.claims)]);
    await client.query('set role authenticated');
    assert.equal((await client.query('select public.financial_access_status() as value')).rows[0].value.allowed, false);
    for (const { relname } of surfaces) await savepoint(async () => {
      try {
        const result = await client.query(`select * from public."${relname.replaceAll('"', '""')}"`);
        assert.equal(result.rows.length, 0, `${relname} must hide all rows during containment`);
      } catch (error) { assert.equal(error.code, '42501', `${relname} may only fail with an explicit authorization denial`); }
    });
    const deniedOperations = [
      ["insert into public.accounts(user_id,name,currency,opening_balance) values($1,'Forbidden containment write','MYR','0.01')", [fixture.user]],
      ["select public.create_ledger_account('{}'::jsonb)", []],
      ["select public.post_ledger_event('{}'::jsonb)", []],
      ["select public.delete_own_account('DELETE')", []],
    ];
    for (const [sql, args] of deniedOperations) await savepoint(async () => assert.rejects(client.query(sql, args), error => error.code === '42501', 'Containment must reject each operation independently, not through a previously aborted transaction'));
    await savepoint(async () => {
      assert.equal((await client.query("update public.accounts set name='Forbidden containment update' where user_id=$1 returning id", [fixture.user])).rows.length, 0);
      assert.equal((await client.query('delete from public.accounts where user_id=$1 returning id', [fixture.user])).rows.length, 0);
    });
    assert.deepEqual(await snapshot(client), before, 'Containment probes must preserve exact financial, approval, activation and audit rows before rollback');
  } finally { await client.query('rollback'); await client.query('reset role'); }
  assert.deepEqual(await definitions(), originalDefinitions, 'Rollback must restore the exact financial guard, token hook, owners and ACLs');
  assert.deepEqual(await snapshot(client), before, 'Rollback must preserve every restored table and history row');
  await client.query("select set_config('request.jwt.claims',$1,false)", [JSON.stringify(fixture.claims)]);
  await client.query('set role authenticated');
  assert.equal((await client.query('select public.financial_access_status() as value')).rows[0].value.allowed, true);
  assert.equal((await client.query('select balance from public.exact_accounts')).rows[0].balance, '10.01');
  return { status: 'PASS', financialSurfaces: surfaces.length, explicitOperationDenials: 4, updateDeleteRows: 0, errorIsolation: 'SAVEPOINT around every expected denial', hookAndHistoryPreserved: true, originalGuardAndAccessRestored: true, hostedOrProductionAction: false };
}
async function restoredMfaBoundaries(client, fixture) {
  const actor = async () => {
    await client.query('reset role');
    await client.query("select set_config('request.jwt.claims',$1,false)", [JSON.stringify(fixture.claims)]);
    await client.query('set role authenticated');
  };
  const status = async () => (await client.query('select public.financial_access_status() as value')).rows[0].value;
  const assertDenied = async (work, label) => assert.rejects(work, error => error.code === '42501', label);
  const noFinancialAccess = async () => {
    await actor();
    assert.equal((await status()).allowed, false);
    assert.equal((await client.query('select * from public.exact_accounts')).rows.length, 0);
    await assertDenied(client.query("insert into public.accounts(user_id,name,currency,opening_balance) values($1,'Forbidden restored write','MYR','0.01')", [fixture.user]), 'Restored denial must block financial writes');
  };
  const deniedApprovalAndHook = async () => {
    const sealed = await snapshot(client);
    await actor();
    await assertDenied(client.query('select public.approve_mfa_factor($1,true)', [fixture.replacement]), 'Expired management or all-factor loss must not approve a replacement');
    await client.query('reset role'); await client.query('set role supabase_auth_admin');
    const hook = (await client.query('select prism_private.mfa_access_token_hook($1::jsonb) as value', [JSON.stringify({ user_id: fixture.user, authentication_method: 'totp', claims: fixture.claims })])).rows[0].value;
    assert.equal(hook.error?.http_code, 403, 'Restored hook must reject fresh-mail replacement without a live approved management grant');
    assert.deepEqual(await snapshot(client), sealed, 'Denied approval and hook must preserve exact financial rows, activation and audit state');
  };
  await actor();
  const restored = await status();
  assert.equal(restored.allowed, true);
  assert.equal(restored.activated, true);
  assert.deepEqual([...restored.approvedFactorIds].sort(), [...fixture.factors].sort());
  assert.equal(restored.managementAuthorized, false, 'Restoration must not renew a persisted expired management window');
  assert.equal(restored.mailboxVerified, true);
  assert.equal((await client.query('select balance from public.exact_accounts')).rows[0].balance, '10.01');
  const containment = await restoredContainment(client, fixture);
  await client.query('reset role');
  await client.query("insert into auth.mfa_factors(id,user_id,status) values($1,$2,'verified')", [fixture.replacement, fixture.user]);
  await client.query('update auth.sessions set factor_id=$1 where id=$2', [fixture.replacement, fixture.session]);
  await noFinancialAccess();
  await deniedApprovalAndHook();
  await client.query('update auth.sessions set factor_id=$1 where id=$2', [fixture.factors[1], fixture.session]);
  await client.query('delete from auth.mfa_factors where id=$1', [fixture.factors[0]]);
  await noFinancialAccess();
  await client.query('reset role');
  await client.query('delete from auth.mfa_factors where id=$1', [fixture.factors[1]]);
  await client.query('update auth.sessions set factor_id=$1 where id=$2', [fixture.replacement, fixture.session]);
  await noFinancialAccess();
  await deniedApprovalAndHook();
  assert.equal((await client.query('select count(*)::int as n from prism_private.mfa_activated_accounts where user_id=$1', [fixture.user])).rows[0].n, 1, 'All-factor loss must preserve sticky activation');
  assert.equal((await client.query('select count(*)::int as n from prism_private.approved_mfa_factors where user_id=$1', [fixture.user])).rows[0].n, 0);
  assert.equal((await client.query('select count(*)::int as n from prism_private.mfa_security_events where user_id=$1', [fixture.user])).rows[0].n, 2, 'Factor loss must preserve approval audit history');
  return { status: 'PASS', evidenceClass: 'restored PostgreSQL 18 with explicit synthetic Auth rows; not native GoTrue or physical custody', approvedFactorsRestored: 2, activationAndAuditRestored: true, expiredManagementDenied: true, missingFactorReadWriteDenied: true, totalFactorLossRebootstrapDenied: true, deniedOperationsPreservedExactState: true, containment };
}
let source = cluster(sourceDir), restored, client;
try {
  await source.initialise(); await source.start(); client = source.getPgClient('postgres', '127.0.0.1'); await client.connect();
  const bootstrap = await readFile('supabase/tests/auth-fixture.sql', 'utf8'); await client.query(bootstrap);
  const migrations = (await readdir('supabase/migrations')).filter(path => path.endsWith('.sql')).sort(); assert.equal(migrations.length, 19);
  for (const path of migrations) await client.query(await readFile(`supabase/migrations/${path}`, 'utf8'));
  const db = { exec: sql => client.query(sql), query: (sql, args) => client.query(sql, args) };
  await exerciseLedger(db); const mfaFixture = await seedMfaRecovery(client); const before = await snapshot(client);
  assert(before.some(table => table.table === 'journals' && table.count > 0));
  await client.end(); client = null; await source.stop();
  await cp(sourceDir, backupDir, { recursive: true, errorOnExist: true, force: false });
  await source.start(); client = source.getPgClient('postgres', '127.0.0.1'); await client.connect();
  await client.query('delete from auth.users'); const destroyed = await snapshot(client);
  assert.notDeepEqual(destroyed, before, 'Synthetic erasure must change the source after backup');
  await client.end(); client = null; await source.stop();
  await cp(backupDir, restoreDir, { recursive: true, errorOnExist: true, force: false });
  restored = cluster(restoreDir); await restored.start(); client = restored.getPgClient('postgres', '127.0.0.1'); await client.connect();
  const after = await snapshot(client); assert.deepEqual(after, before, 'All public/Auth/private financial rows must restore exactly');
  const mfaRecovery = await restoredMfaBoundaries(client, mfaFixture);
  await exerciseLedgerBoundaries({ exec: sql => client.query(sql), query: (sql, args) => client.query(sql, args) });
  await mkdir('artifacts/phase7', { recursive: true });
  await writeFile('artifacts/phase7/restore-rehearsal.json', JSON.stringify({ status: 'PASS', method: 'Clean shutdown; cold cluster snapshot; synthetic source erasure; restore to a separate fresh directory; exact full-table comparison and restored authorization probes', environment: 'disposable native PostgreSQL 18; loopback only', migrations: migrations.length, tables: before, mfaRecovery, hostedRestore: 'not tested', crossVersionRestore: 'not tested' }, null, 2));
  console.log(`PASS cold snapshot/restore: all ${before.length} public/Auth/private tables, ${migrations.length} migrations, exact financial text and restored owner/session/MFA boundaries`);
  console.log('PASS restored mandatory MFA: exact approval/activation/audit state, expired management denial, missing-factor read/write denial and sticky total-loss lockout');
  console.log('PASS disposable rollback containment: all 44 financial surfaces deny access, operation errors isolated by SAVEPOINT, hook/history unchanged and original guard/access restored');
} finally { if (client) await client.end(); if (restored) await restored.stop(); await source.stop(); }
