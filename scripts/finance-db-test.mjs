import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const db = await PGlite.create();
const run = async file => db.exec(await readFile(file, 'utf8'));
const userA = randomUUID(), userB = randomUUID(), sessionA = randomUUID(), sessionB = randomUUID();
async function identity(user, session, extra = {}) {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claims',$1,false)", [JSON.stringify({ sub: user, session_id: session, aal: 'aal1', ...extra })]);
  await db.exec('set role authenticated');
}

try {
  await run('supabase/tests/auth-fixture.sql');
  await run('supabase/migrations/20260928000200_initial_finance_tracker.sql');
  await db.query('insert into auth.users(id) values($1),($2)', [userA, userB]);
  await db.query('insert into auth.sessions(id,user_id) values($1,$2),($3,$4)', [sessionA,userA,sessionB,userB]);
  await identity(userA, sessionA);
  const category = (await db.query("insert into public.categories(user_id,name,type,color) values(auth.uid(),'Food','expense','#123456') returning id")).rows[0].id;
  const payment = (await db.query("insert into public.payment_methods(user_id,name,type) values(auth.uid(),'Cash','cash') returning id")).rows[0].id;
  const transaction = (await db.query("insert into public.transactions(user_id,amount,currency,type,category_id,payment_method_id,description) values(auth.uid(),'0.10','MYR','expense',$1,$2,'Coffee') returning id", [category,payment])).rows[0].id;
  await assert.rejects(db.query("insert into public.transactions(user_id,amount,currency,type) values(auth.uid(),'0.01','JPY','expense')"));
  await identity(userB, sessionB);
  assert.equal((await db.query('select * from public.transactions')).rows.length, 0);
  assert.equal((await db.query('update public.transactions set description=$1 where id=$2', ['stolen',transaction])).affectedRows, 0);
  assert.equal((await db.query('delete from public.categories where id=$1', [category])).affectedRows, 0);
  await identity(userA, sessionA);
  await db.query('delete from public.categories where id=$1', [category]);
  assert.equal((await db.query('select category_id from public.transactions where id=$1',[transaction])).rows[0].category_id, null);
  await db.exec('reset role'); await db.query("insert into auth.mfa_factors values($1,$2,'verified')", [randomUUID(),userA]);
  await identity(userA, sessionA);
  assert.equal((await db.query('select * from public.transactions')).rows.length, 0);
  await identity(userA, sessionA, { aal:'aal2' });
  assert.equal((await db.query('select * from public.transactions')).rows.length, 1);
  console.log('PASS migration replay, exact JPY constraint, CRUD relationships, ownership RLS, and MFA AAL enforcement');
} finally { await db.close(); }
