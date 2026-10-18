import { financialClaims } from './lib/financial-test-identity.mjs';
import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

// Disposable, in-memory, synthetic data. No hosted URL/key is read.
const db = await PGlite.create();
const migration = (await readdir("supabase/migrations")).find((f) =>
  f.endsWith("_phase4_planning.sql"),
);
const checks = [];
const check = async (name, fn) => {
  await fn();
  checks.push(name);
  console.log("PASS " + name);
};
try {
  await db.exec(await readFile("supabase/tests/auth-fixture.sql", "utf8"));
  for (const f of (await readdir("supabase/migrations"))
    .filter((f) => f.endsWith(".sql") && f !== migration)
    .sort())
    await db.exec(await readFile(`supabase/migrations/${f}`, "utf8"));
  const u = randomUUID(),
    v = randomUUID(),
    s = randomUUID(),
    t = randomUUID();
  await db.query("insert into auth.users(id) values($1),($2)", [u, v]);
  await db.query(
    "insert into auth.sessions(id,user_id) values($1,$2),($3,$4)",
    [s, u, t, v],
  );
  const identity = async (id = u, session = s, extra = {}) => {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claims',$1,false)", [
      JSON.stringify(await financialClaims(db,{ sub: id, session_id: session, aal:'aal2', ...extra })),
    ]);
    await db.exec("set role authenticated");
  };
  await identity();
  const cat = (
    await db.query(
      "insert into public.categories(user_id,name,type,color) values(auth.uid(),'Food','expense','#123456') returning id",
    )
  ).rows[0].id;
  const account = (
    await db.query(
      "insert into public.accounts(user_id,name,currency,opening_balance) values(auth.uid(),'Bank','MYR',1000) returning id",
    )
  ).rows[0].id;
  const savings = (
    await db.query(
      "insert into public.accounts(user_id,name,currency,opening_balance) values(auth.uid(),'Savings','MYR',0) returning id",
    )
  ).rows[0].id;
  const debt = (
    await db.query(
      "insert into public.person_debts(user_id,direction,counterparty,currency,original_amount) values(auth.uid(),'i_owe','Loan','MYR',1000) returning id",
    )
  ).rows[0].id;
  await db.query(
    "insert into public.debt_repayments(user_id,debt_id,currency,amount,account_id) values(auth.uid(),$1,'MYR',20,$2)",
    [debt, account],
  );
  const tx = (
    await db.query(
      "insert into public.transactions(user_id,amount,currency,type,category_id,account_id,transaction_date) values(auth.uid(),700,'MYR','expense',$1,$2,'2026-09-20') returning id",
      [cat, account],
    )
  ).rows[0].id;
  for (const month of ["2026-09-01", "2026-10-01"])
    await db.query(
      "insert into public.monthly_budgets(user_id,category_id,currency,month,amount) values(auth.uid(),$1,'MYR',$2,800)",
      [cat, month],
    );
  const before = (
    await db.query("select to_jsonb(t) as row from public.transactions t")
  ).rows;
  const repaymentBefore = (
    await db.query("select to_jsonb(t) as row from public.debt_repayments t")
  ).rows;
  await db.exec("reset role");
  await db.exec(await readFile(`supabase/migrations/${migration}`, "utf8"));
  await identity();
  await check(
    "forward migration preserves historical money and default rollover",
    async () => {
      assert.deepEqual(
        (await db.query("select to_jsonb(t) as row from public.transactions t"))
          .rows,
        before,
      );
      assert.deepEqual(
        (
          await db.query(
            "select to_jsonb(t) as row from public.debt_repayments t",
          )
        ).rows,
        repaymentBefore,
      );
      assert.equal(
        (
          await db.query(
            "select rollover_enabled from public.monthly_budgets limit 1",
          )
        ).rows[0].rollover_enabled,
        false,
      );
    },
  );
  await check(
    "native exact posted spending excludes transfers, future activity and principal",
    async () => {
      await db.query(
        "insert into public.transfers(user_id,source_account_id,destination_account_id,source_currency,destination_currency,source_amount,destination_amount) values(auth.uid(),$1,$2,'MYR','MYR',500,500)",
        [account, savings],
      );
      await db.query(
        "insert into public.transactions(user_id,amount,currency,type,category_id,transaction_date) values(auth.uid(),500,'MYR','expense',$1,'9999-01-01')",
        [cat],
      );
      assert.equal(
        (
          await db.query(
            "select spent from public.exact_monthly_budgets where month='2026-09-01'",
          )
        ).rows[0].spent,
        "700.00",
      );
      await db.query("update public.transactions set amount=750 where id=$1", [
        tx,
      ]);
      assert.equal(
        (
          await db.query(
            "select spent from public.exact_monthly_budgets where month='2026-09-01'",
          )
        ).rows[0].spent,
        "750.00",
      );
    },
  );
  const savePlan = async (
    debtId = debt,
    currency = "MYR",
    principal = "90071992547409.93",
  ) =>
    db.query(
      "insert into public.debt_plans(user_id,debt_id,currency,debt_type,scenario_principal,balance_as_of,apr_bps,rate_mode,minimum_payment,frequency,first_payment_date) values(auth.uid(),$1,$2,'personal',$3,'2026-10-01',1200,'fixed',100,'monthly','2026-10-31') returning id",
      [debtId, currency, principal],
    );
  const plan = (await savePlan()).rows[0].id;
  await db.query(
    "insert into public.reserve_plans(user_id,month,currency,name,amount) values(auth.uid(),'2026-10-01','MYR','Buffer',500)",
  );
  await check(
    "planning records do not change cash; exact text never loses a cent",
    async () => {
      assert.equal(
        (
          await db.query(
            "select scenario_principal from public.exact_debt_plans",
          )
        ).rows[0].scenario_principal,
        "90071992547409.93",
      );
      assert.equal(
        (
          await db.query(
            "select balance from public.exact_accounts where id=$1",
            [account],
          )
        ).rows[0].balance,
        "-270.00",
      );
    },
  );
  await check(
    "constraints reject rounding, wrong dates, currency and duplicate contracts",
    async () => {
      await assert.rejects(savePlan(debt, "USD"));
      await assert.rejects(savePlan());
      for (const sql of [
        "update public.debt_plans set minimum_payment=0.001",
        "update public.debt_plans set apr_bps=-1",
        "update public.debt_plans set first_payment_date='2026-09-01'",
        "update public.reserve_plans set amount=1.001",
        "update public.monthly_budgets set alert_percent=101",
      ]) {
        await assert.rejects(db.query(sql));
      }
    },
  );
  await check(
    "financial history cannot be erased or recast; note edits remain allowed",
    async () => {
      await assert.rejects(
        db.query("delete from public.person_debts where id=$1", [debt]),
      );
      await assert.rejects(
        db.query("delete from public.debt_repayments where debt_id=$1", [debt]),
      );
      await assert.rejects(
        db.query(
          "update public.debt_repayments set amount=10 where debt_id=$1",
          [debt],
        ),
      );
      await assert.rejects(
        db.query(
          "update public.person_debts set direction='owed_to_me' where id=$1",
          [debt],
        ),
      );
      await db.query(
        "update public.person_debts set notes='Reviewed' where id=$1",
        [debt],
      );
    },
  );
  await check(
    "RLS blocks cross owner reads, edits, deletes, references and reassignment",
    async () => {
      await identity(v, t);
      for (const table of [
        "reserve_plans",
        "debt_plans",
        "exact_reserve_plans",
        "exact_debt_plans",
      ])
        assert.equal(
          (await db.query(`select * from public.${table}`)).rows.length,
          0,
        );
      assert.equal(
        (
          await db.query(
            "update public.debt_plans set apr_bps=0 where id=$1 returning id",
            [plan],
          )
        ).rows.length,
        0,
      );
      assert.equal(
        (
          await db.query(
            "delete from public.debt_plans where id=$1 returning id",
            [plan],
          )
        ).rows.length,
        0,
      );
      await assert.rejects(savePlan());
      await identity();
      await assert.rejects(
        db.query("update public.debt_plans set user_id=$1 where id=$2", [
          v,
          plan,
        ]),
      );
      await assert.rejects(
        db.query("update public.reserve_plans set user_id=$1", [v]),
      );
    },
  );
  await check(
    "anonymous, revoked session, anonymous auth and MFA AAL1 are denied",
    async () => {
      await db.exec("reset role;set role anon");
      for (const table of ["reserve_plans", "debt_plans", "exact_debt_plans"])
        await assert.rejects(db.query(`select * from public.${table}`));
      for (const extra of [
        { session_id: randomUUID() },
        { is_anonymous: true },
      ]) {
        await identity(u, s, extra);
        assert.equal(
          (await db.query("select * from public.exact_debt_plans")).rows.length,
          0,
        );
        await assert.rejects(
          db.query(
            "insert into public.reserve_plans(user_id,month,currency,name,amount) values(auth.uid(),'2026-11-01','MYR','Blocked',1)",
          ),
        );
      }
      await db.exec("reset role");
      await db.query("insert into auth.mfa_factors values($1,$2,'verified')", [
        randomUUID(),
        u,
      ]);
      await identity(u, s, { aal: 'aal1' });
      assert.equal(
        (await db.query("select * from public.exact_debt_plans")).rows.length,
        0,
      );
      await identity(u, s, { aal: "aal2" });
      assert.equal(
        (await db.query("select * from public.exact_debt_plans")).rows.length,
        1,
      );
    },
  );
  await check("explicit account erasure remains functional", async () => {
    await db.query("select public.delete_own_account('DELETE')");
    await db.exec("reset role");
    assert.equal(
      (await db.query("select * from public.debt_plans where user_id=$1", [u]))
        .rows.length,
      0,
    );
  });
  console.log(
    `PASS ${checks.length} Phase 4 database groups (isolated PGlite)`,
  );
} catch (e) {
  console.error(e.message, e.detail);
  process.exitCode = 1;
} finally {
  await db.close();
}
