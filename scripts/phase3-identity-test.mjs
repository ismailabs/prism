import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

// Called only during disposable synthetic replay, in PGlite and native PostgreSQL.
export async function exerciseIdentityDefaultsMigration(db, sql) {
  const previous = randomUUID(), fresh = randomUUID(), malay = randomUUID();
  await db.query('insert into auth.users(id) values($1)', [previous]);
  await db.query("update public.profiles set currency='JPY', language='ms', financial_timezone='Asia/Tokyo' where id=$1", [previous]);
  const account = (await db.query("insert into public.accounts(user_id,name,currency,opening_balance) values($1,'Previous USD account','USD','90071992547409.93') returning id", [previous])).rows[0].id;
  await db.query("insert into public.transactions(user_id,account_id,amount,currency,type,description) values($1,$2,'0.01','USD','income','Previous native record')", [previous, account]);
  const snapshot = async () => ({
    profile: (await db.query('select * from public.profiles where id=$1', [previous])).rows,
    accounts: (await db.query('select * from public.exact_accounts where user_id=$1', [previous])).rows,
    transactions: (await db.query('select * from public.exact_transactions where user_id=$1', [previous])).rows,
  });
  const before = await snapshot();
  const functionSecurity = async () => (await db.query("select prosecdef,proconfig,proacl::text as acl,proowner::text as owner from pg_catalog.pg_proc where oid='prism_private.create_profile()'::regprocedure")).rows[0];
  const securityBefore = await functionSecurity();
  assert.equal(securityBefore.prosecdef, true);
  assert.equal(before.accounts[0].balance, '90071992547409.94');
  await db.exec(sql);
  assert.deepEqual(await functionSecurity(), securityBefore, 'Function owner, grants, definer and search path must stay unchanged');
  assert.deepEqual(await snapshot(), before, 'Existing preferences, rows and exact native amounts must not change');
  await db.query('insert into auth.users(id,raw_user_meta_data) values($1,$2::jsonb)', [fresh, JSON.stringify({ full_name: 'Synthetic OAuth member' })]);
  const preferences = async () => (await db.query('select currency,language,financial_timezone from public.profiles where id=$1', [fresh])).rows[0];
  assert.deepEqual(await preferences(), { currency: 'MYR', language: 'en', financial_timezone: 'Asia/Kuala_Lumpur' });
  await db.query('insert into auth.users(id,raw_user_meta_data) values($1,$2::jsonb)', [malay, JSON.stringify({ username: 'Malay signup', prism_setup_preferences: { language: 'ms' } })]);
  assert.deepEqual((await db.query('select username,currency,language,financial_timezone from public.profiles where id=$1', [malay])).rows[0], { username: 'Malay signup', currency: 'MYR', language: 'ms', financial_timezone: 'Asia/Kuala_Lumpur' });
  await db.query("update public.profiles set currency='USD',language='ms',financial_timezone='UTC' where id=$1", [fresh]);
  assert.deepEqual(await preferences(), { currency: 'USD', language: 'ms', financial_timezone: 'UTC' }, 'Explicit choices still win');
  await db.exec('reset role');
  await db.query('delete from auth.users where id=$1 or id=$2 or id=$3', [previous, fresh, malay]);
  console.log('PASS Phase 3 profile defaults: MYR/Kuala Lumpur, signup language, explicit choices, and conserved existing exact financial snapshots');
}
