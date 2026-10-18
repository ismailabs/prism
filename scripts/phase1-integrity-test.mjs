import { financialClaims } from './lib/financial-test-identity.mjs';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';

// Synthetic, isolated owners and sessions. Called by both full PGlite replay and
// native PostgreSQL replay; it never connects to a provider project.
export async function exercisePhase1Integrity(db) {
  await db.exec('reset role');
  const user=randomUUID(),other=randomUUID(),session=randomUUID(),otherSession=randomUUID();
  await db.query('insert into auth.users(id) values($1),($2)',[user,other]);
  await db.query('insert into auth.sessions(id,user_id) values($1,$2),($3,$4)',[session,user,otherSession,other]);
  const identity=async(claims,role='authenticated')=>{
    await db.exec('reset role');await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify(await financialClaims(db,claims))]);await db.exec(`set role ${role}`);
  };
  const valid={sub:user,session_id:session,aal:'aal2'};
  await identity(valid);
  await db.query("update public.profiles set financial_timezone='UTC' where id=auth.uid()");
  const account=async(name,currency,opening='100.00')=>(await db.query('insert into public.accounts(user_id,name,currency,opening_balance) values(auth.uid(),$1,$2,$3) returning id',[name,currency,opening])).rows[0].id;
  const tx=async(amount,currency,accountId=null,category=null,date='2000-01-15T12:00:00Z')=>(await db.query("insert into public.transactions(user_id,amount,currency,type,account_id,category_id,transaction_date) values(auth.uid(),$1,$2,'expense',$3,$4,$5) returning id",[amount,currency,accountId,category,date])).rows[0].id;
  const balance=async(id)=>(await db.query('select balance from public.exact_accounts where id=$1',[id])).rows[0].balance;
  const ids={};
  for(const currency of ['MYR','USD','EUR','JPY']) {
    ids[currency]=await account(currency,currency,currency==='JPY'?'100':'100.00');
    const amount=currency==='JPY'?'9999999999999999':'9999999999999999.99';
    const id=await tx(amount,currency);
    assert.equal((await db.query('select amount from public.exact_transactions where id=$1',[id])).rows[0].amount,amount);
    for(const invalid of ['0','-1','10000000000000000',currency==='JPY'?'1.1':'1.001'])await assert.rejects(tx(invalid,currency),`${currency}: ${invalid}`);
  }
  const destination=await account('Destination','MYR','0.00');
  const transfer=async(date)=>(await db.query("insert into public.transfers(user_id,source_account_id,destination_account_id,source_currency,destination_currency,source_amount,destination_amount,occurred_at) values(auth.uid(),$1,$2,'MYR','MYR','10.10','10.10',$3) returning id",[ids.MYR,destination,date])).rows[0].id;
  const future=await transfer('2099-01-01');assert.equal(await balance(ids.MYR),'100.00');assert.equal(await balance(destination),'0.00');
  const posted=await transfer('2000-01-01');assert.equal(await balance(ids.MYR),'89.90');assert.equal(await balance(destination),'10.10');
  await db.query('delete from public.transfers where id=$1',[posted]);assert.equal(await balance(ids.MYR),'100.00');assert.equal(await balance(destination),'0.00');
  await db.query('delete from public.transfers where id=$1',[future]);
  await assert.rejects(tx('1.00','USD',ids.MYR),'Currency mismatch');
  const category=(await db.query("insert into public.categories(user_id,name,type) values(auth.uid(),'Phase 1','expense') returning id")).rows[0].id;
  await db.query("insert into public.monthly_budgets(user_id,category_id,currency,month,amount) values(auth.uid(),$1,'MYR','2000-01-01','10.00')",[category]);
  await db.query("insert into public.monthly_budgets(user_id,category_id,currency,month,amount) values(auth.uid(),$1,'MYR','2099-01-01','10.00')",[category]);
  await tx('0.10','MYR',ids.MYR,category);await tx('5.00','MYR',ids.MYR,category,'2099-01-01');
  const objective=(await db.query("insert into public.objectives(user_id,kind,name,currency,target_amount) values(auth.uid(),'savings','Earmark','MYR','50.00') returning id")).rows[0].id;
  const allocated=await tx('1.00','MYR',ids.MYR,category);
  await db.query("insert into public.objective_contributions(user_id,objective_id,currency,transaction_id) values(auth.uid(),$1,'MYR',$2)",[objective,allocated]);
  const debt=(await db.query("insert into public.person_debts(user_id,direction,counterparty,currency,original_amount) values(auth.uid(),'i_owe','Phase 1','MYR','50.00') returning id")).rows[0].id;
  const principal=await tx('2.00','MYR',ids.MYR,category);
  await db.query("insert into public.debt_repayments(user_id,debt_id,currency,transaction_id,paid_at) values(auth.uid(),$1,'MYR',$2,'2000-01-15')",[debt,principal]);
  await db.query("insert into public.debt_repayments(user_id,debt_id,currency,amount,account_id,paid_at) values(auth.uid(),$1,'MYR','3.00',$2,'2099-01-01')",[debt,ids.MYR]);
  assert.equal((await db.query("select spent from public.exact_monthly_budgets where category_id=$1 and month='2000-01-01'",[category])).rows[0].spent,'0.10');
  assert.match((await db.query("select spent from public.exact_monthly_budgets where category_id=$1 and month='2099-01-01'",[category])).rows[0].spent,/^0(?:\.0+)?$/);
  assert.equal(await balance(ids.MYR),'96.90','Future repayment/expense excluded; linked repayment not counted twice');
  await assert.rejects(db.query('delete from public.person_debts where id=$1',[debt]),/repayment history/);
  assert.equal((await db.query('select count(*)::int as n from public.debt_repayments where debt_id=$1',[debt])).rows[0].n,2);assert.equal(await balance(ids.MYR),'96.90');
  const empty=(await db.query("insert into public.person_debts(user_id,direction,counterparty,currency,original_amount) values(auth.uid(),'i_owe','Empty','MYR','1.00') returning id")).rows[0].id;
  assert.equal((await db.query('delete from public.person_debts where id=$1 returning id',[empty])).rows.length,1);

  await identity({sub:other,session_id:otherSession,aal:'aal2'});
  assert.equal((await db.query('select count(*)::int as n from public.exact_accounts')).rows[0].n,0);
  assert.equal((await db.query('update public.accounts set name=$1 where id=$2 returning id',['Intrusion',ids.MYR])).rows.length,0);
  assert.equal((await db.query('delete from public.person_debts where id=$1 returning id',[debt])).rows.length,0);
  await assert.rejects(tx('1.00','MYR',ids.MYR),'Other-owner account FK');
  await assert.rejects(tx('1.00','MYR',null,category),'Other-owner category FK');
  const denied=async(claims)=>{
    await identity(claims);assert.equal((await db.query('select count(*)::int as n from public.exact_accounts')).rows[0].n,0);
    await assert.rejects(tx('1.00','MYR'),'Invalid session must deny writes');
  };
  await denied({...valid,session_id:randomUUID()});await denied({...valid,session_id:otherSession});await denied({sub:user,aal:'aal1'});await denied({...valid,is_anonymous:true});
  await db.exec('reset role');await db.query("update auth.sessions set not_after='2000-01-01' where id=$1",[session]);await denied(valid);
  await db.exec('reset role');await db.query('update auth.sessions set not_after=null where id=$1',[session]);
  await db.query("insert into auth.mfa_factors(id,user_id,status) values($1,$2,'verified')",[randomUUID(),user]);await denied({...valid,aal:'aal1'});
  await identity({...valid,aal:'aal2'});assert.equal((await db.query('select count(*)::int as n from public.exact_accounts')).rows[0].n,5);
  await db.exec('reset role');await db.query('delete from auth.sessions where id=$1',[session]);await denied({...valid,aal:'aal2'});
  await identity({},'anon');await assert.rejects(db.query('select * from public.exact_accounts'));await assert.rejects(tx('1.00','MYR'));
  await db.exec('reset role');
  console.log('PASS Phase 1: four-currency bounds, future/cash/budget exclusions, conserved deletion, debt history, owner/FK/session/expiry/revocation/anonymous/MFA isolation');
}
