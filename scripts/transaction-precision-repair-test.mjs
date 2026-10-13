import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

// Reproduce the actual historical hosted constraint instead of assuming a fresh
// migration replay has identical security semantics.
const db = await PGlite.create();
const repair = await readFile('supabase/migrations/20261013031257_enforce_hosted_transaction_currency_precision.sql', 'utf8');
const user = randomUUID();
try {
  await db.exec(await readFile('supabase/tests/auth-fixture.sql', 'utf8'));
  await db.exec(await readFile('supabase/migrations/20260928000200_initial_finance_tracker.sql', 'utf8'));
  const originalCheck = (await db.query("select conname from pg_constraint where conrelid='public.transactions'::regclass and contype='c' and pg_get_constraintdef(oid) like '%amount%'")).rows;
  assert.equal(originalCheck.length, 1);
  assert.match(originalCheck[0].conname, /^[a-z_]+$/);
  await db.exec(`alter table public.transactions alter column amount type numeric;
    alter table public.transactions drop constraint ${originalCheck[0].conname};
    alter table public.transactions add constraint transactions_amount_check
      check (amount > 0 and amount <> 'NaN'::numeric and amount < 10000000000000000);`);
  await db.query('insert into auth.users(id) values($1)', [user]);
  const insert = (currency, amount) => db.query(
    'insert into public.transactions(user_id,type,currency,amount) values($1,$2,$3,$4) returning id',
    [user, 'income', currency, amount],
  );
  const invalid = (await insert('MYR', '1.234')).rows[0].id;
  await assert.rejects(db.exec(repair), /transactions_currency_precision/);
  await db.exec('rollback');
  assert.equal((await db.query('select amount::text from public.transactions where id=$1', [invalid])).rows[0].amount, '1.234');
  assert.equal((await db.query("select count(*)::int as n from pg_constraint where conname='transactions_currency_precision'")).rows[0].n, 0);
  await db.query('delete from public.transactions where id=$1', [invalid]);
  await insert('MYR', '90071992547409.93');
  const before = (await db.query('select id,amount::text,currency from public.transactions order by id')).rows;
  await assert.rejects(db.exec(repair.replace(/commit;\s*$/i, 'select 1/0; commit;')), /division by zero/);
  await db.exec('rollback');
  await db.exec(repair);
  assert.deepEqual((await db.query('select id,amount::text,currency from public.transactions order by id')).rows, before);
  for (const currency of ['MYR', 'USD', 'EUR', 'JPY']) {
    const amount = currency === 'JPY' ? '123' : '1.23';
    const id = (await insert(currency, amount)).rows[0].id;
    assert.equal((await db.query('select amount::text from public.transactions where id=$1', [id])).rows[0].amount, amount);
    for (const invalidAmount of [currency === 'JPY' ? '1.2' : '1.234', '0', '-1']) {
      await assert.rejects(insert(currency, invalidAmount), /check constraint/);
    }
    await assert.rejects(db.query('update public.transactions set amount=$1 where id=$2', [currency === 'JPY' ? '1.2' : '1.234', id]), /transactions_currency_precision/);
  }
  console.log('PASS historical hosted drift, atomic invalid-history rejection, late-failure rollback, exact preserved rows and four-currency insert/update precision');
} finally {
  await db.close();
}
