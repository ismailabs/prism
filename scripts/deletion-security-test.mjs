import { financialClaims } from './lib/financial-test-identity.mjs';
// Synthetic only: no connection string, hosted credentials or RPC transport.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { randomUUID, createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { replay } from './foundations-db-test.mjs';

export async function exerciseDeletionSecurity(db) {
  const inspection = await readFile('docs/release-validation/hosted-deletion-inspection.sql', 'utf8');
  const proposal = await readFile('docs/release-validation/private-deletion-revoke.sql', 'utf8');
  const results = [];
  const pass = name => { results.push({ name, status: 'PASS' }); console.log('PASS', name); };
  const inspect = () => db.exec(inspection);
  const inspectionRows = await inspect();
  assert(inspectionRows.some(result => result.rows.some(row => row.current_setting === 'on')));
  assert.equal((await db.query("select current_setting('transaction_read_only') as mode")).rows[0].mode, 'off');
  pass('catalogue inspection is read-only and restores transaction mode');

  const user = randomUUID(), other = randomUUID(), session = randomUUID();
  await db.query('insert into auth.users(id) values($1),($2)', [user, other]);
  await db.query('insert into auth.sessions(id,user_id) values($1,$2)', [session, user]);
  const identity = async sid => db.query("select set_config('request.jwt.claims',$1,false)", [JSON.stringify(await financialClaims(db,{ sub: user, session_id: sid, aal: 'aal2' }))]);
  await identity(session);
  const users = async () => (await db.query('select id from auth.users where id=any($1::uuid[]) order by id', [[user, other]])).rows;
  const before = await users();
  const unrelated = async () => (await db.query("select p.oid::regprocedure::text as signature,p.proacl::text,p.prosecdef,p.proconfig,md5(pg_get_functiondef(p.oid)) as definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','prism_private') and p.oid<>to_regprocedure('prism_private.delete_own_account()') order by 1")).rows;
  const original = await unrelated();
  const permitted = async () => (await db.query("select has_function_privilege('authenticated','prism_private.delete_own_account()','execute') as permitted")).rows[0].permitted;
  const denied = async (sql, code) => {
    await db.exec('set role authenticated');
    try { await assert.rejects(db.query(sql), error => error.code === code); }
    finally { await db.exec('reset role'); }
  };
  await denied('select prism_private.delete_own_account()', '42501');
  assert.deepEqual(await users(), before);
  pass('fresh replay denies unconfirmed deletion without user changes');

  await db.exec('begin; grant execute on function prism_private.delete_own_account() to authenticated; set local role authenticated;');
  await db.query('select prism_private.delete_own_account()');
  await db.exec('reset role');
  assert.deepEqual(await users(), [{ id: other }]);
  await db.exec('rollback');
  assert.deepEqual(await users(), before);
  pass('historical bypass affects only the synthetic owner; rollback restores it');

  await db.exec('grant execute on function prism_private.delete_own_account() to public,anon,authenticated');
  await db.exec(proposal);
  await db.exec(proposal);
  assert.equal(await permitted(), false);
  assert.equal((await db.query("select has_function_privilege('anon','prism_private.delete_own_account()','execute') as permitted")).rows[0].permitted, false);
  assert.deepEqual(await users(), before);
  assert.deepEqual(await unrelated(), original);
  pass('idempotent revocation preserves users and unrelated function ACLs/definitions');

  await db.exec('create role deletion_test_mid; create role deletion_test_leaf; grant deletion_test_mid to authenticated; grant deletion_test_leaf to deletion_test_mid; grant execute on function prism_private.delete_own_account() to deletion_test_leaf,authenticated;');
  const indirect = (await inspect()).flatMap(result => result.rows).find(row => row.root_role === 'authenticated' && row.granted_role === 'deletion_test_leaf');
  assert.equal(indirect.depth, 2);
  assert.equal(indirect.effective_inherited, true);
  assert.equal(indirect.effective_set, true);
  await assert.rejects(db.exec(proposal), /Inherited deletion permission remains/);
  await db.exec('rollback');
  assert.equal(await permitted(), true, 'failed proposal rolls back direct ACL changes');
  assert.deepEqual(await users(), before);
  await db.exec('revoke deletion_test_mid from authenticated');
  await db.exec(proposal);
  pass('transitive inherited grants are inspected and abort revocation atomically');

  await db.exec('grant deletion_test_mid to authenticated with inherit false, set true');
  assert.equal(await permitted(), false, 'SET-only access escapes the original EXECUTE guard');
  const setOnly = (await inspect()).flatMap(result => result.rows).find(row => row.root_role === 'authenticated' && row.granted_role === 'deletion_test_leaf');
  assert.equal(setOnly.effective_inherited, false);
  assert.equal(setOnly.effective_set, true);
  await assert.rejects(db.exec(proposal), /SET-role deletion permission remains/);
  await db.exec('rollback');
  assert.deepEqual(await users(), before);
  await db.exec('revoke deletion_test_mid from authenticated');
  await db.exec(proposal);
  pass('SET-only grants are reported and prevent a false safe repair result');

  await db.exec('grant deletion_test_mid to authenticated with admin true, inherit false, set false');
  assert.equal(await permitted(), false);
  const adminOnly = (await inspect()).flatMap(result => result.rows).find(row => row.root_role === 'authenticated' && row.granted_role === 'deletion_test_mid');
  assert.equal(adminOnly.effective_inherited, false);
  assert.equal(adminOnly.effective_set, false);
  assert.equal(adminOnly.effective_admin, true);
  await db.exec('begin; set local role authenticated; grant deletion_test_mid to authenticated with inherit true; reset role;');
  assert.equal(await permitted(), true, 'ADMIN-only authority can restore execution');
  await db.exec('rollback');
  assert.equal(await permitted(), false);
  await db.exec('grant execute on function prism_private.delete_own_account() to authenticated');
  await assert.rejects(db.exec(proposal), /ADMIN-option role authority remains/);
  await db.exec('rollback');
  assert.equal(await permitted(), true, 'ADMIN abort must roll back direct revocation');
  assert.deepEqual(await users(), before);
  await db.exec('revoke deletion_test_mid from authenticated');
  await db.exec(proposal);
  pass('ADMIN-only regrant capability is inspected and aborts the proposal atomically');

  await db.exec('grant execute on function prism_private.delete_own_account() to authenticated; revoke execute on function public.delete_own_account(text) from authenticated;');
  await assert.rejects(db.exec(proposal), /Confirmed deletion privilege contract differs/);
  await db.exec('rollback');
  assert.equal(await permitted(), true);
  await db.exec('grant execute on function public.delete_own_account(text) to authenticated');
  await db.exec(proposal);
  assert.deepEqual(await unrelated(), original);
  pass('unexpected text permissions abort and preserve the original ACL');

  await denied('select prism_private.delete_own_account()', '42501');
  for (const value of ["'WRONG'", 'NULL', "'delete'", "' DELETE '"]) await denied(`select public.delete_own_account(${value})`, '22023');
  await identity(randomUUID());
  await denied("select public.delete_own_account('DELETE')", '42501');
  assert.deepEqual(await users(), before);
  pass('zero-arg, wrong/null confirmation and invalid sessions remain denied');
  await identity(session);
  await db.exec('set role authenticated');
  await db.query("select public.delete_own_account('DELETE')");
  await db.exec('reset role');
  assert.deepEqual(await users(), [{ id: other }]);
  assert.equal((await db.query('select count(*)::int as n from auth.sessions where user_id=$1', [user])).rows[0].n, 0);
  pass('confirmed own deletion removes sessions and preserves another owner');
  return { status: 'PASS', results, proposalSha256: createHash('sha256').update(proposal).digest('hex'), inspectionSha256: createHash('sha256').update(inspection).digest('hex'), hosted: 'INCONCLUSIVE; no hosted query or mutation' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const db = new PGlite();
  try {
    await replay(db);
    const receipt = await exerciseDeletionSecurity(db);
    await mkdir('artifacts/phase7', { recursive: true });
    await writeFile('artifacts/phase7/deletion-security-review.json', JSON.stringify({ ...receipt, environment: `isolated in-memory PGlite; ${(await readdir('supabase/migrations')).filter(file => file.endsWith('.sql')).length} migrations; synthetic Auth` }, null, 2));
  } finally { await db.close(); }
}
