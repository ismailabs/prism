import {PGlite} from '@electric-sql/pglite';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {replay} from './foundations-db-test.mjs';
export async function exerciseGoalActions(db){
 await db.exec('reset role');
 const user=randomUUID(),other=randomUUID(),session=randomUUID(),otherSession=randomUUID();
 await db.query('insert into auth.users(id) values($1),($2)',[user,other]);await db.query('insert into auth.sessions(id,user_id) values($1,$2),($3,$4)',[session,user,otherSession,other]);
 const identity=async(u,s)=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:u,session_id:s,aal:'aal1'})]);await db.exec('set role authenticated');};
 await identity(user,session);
 const main=(await db.query("insert into public.accounts(user_id,name,currency,opening_balance) values(auth.uid(),'Main','MYR',2000) returning id")).rows[0].id;
 const savings=(await db.query("insert into public.accounts(user_id,name,currency,opening_balance) values(auth.uid(),'Savings','MYR',0) returning id")).rows[0].id;
 const goal=(await db.query("insert into public.objectives(user_id,kind,name,currency,target_amount) values(auth.uid(),'goal','Emergency','MYR',2000) returning id")).rows[0].id;
 const otherGoal=(await db.query("insert into public.objectives(user_id,kind,name,currency,target_amount) values(auth.uid(),'goal','Travel','MYR',2000) returning id")).rows[0].id;
 const transfer=(await db.query("insert into public.transfers(user_id,source_account_id,destination_account_id,source_currency,destination_currency,source_amount,destination_amount,occurred_at) values(auth.uid(),$1,$2,'MYR','MYR',1000,1000,'2026-01-01') returning id",[main,savings])).rows[0].id;
 const request=randomUUID(),at='2026-01-01T00:00:00Z';
 const call=(id=request,obj=goal,amount='1000.00')=>db.query('select public.record_goal_contribution($1,$2,$3,$4,$5,$6,$7,$8) as id',[id,obj,'MYR',amount,transfer,savings,'Once',at]);
 assert.equal((await call()).rows[0].id,request);assert.equal((await call()).rows[0].id,request);
 await assert.rejects(call(request,goal,'999.00'));
 await assert.rejects(call(randomUUID(),otherGoal));
 assert.equal((await db.query('select count(*)::int as n from public.objective_contributions')).rows[0].n,1);
 assert.equal((await db.query('select count(*)::int as n from public.transactions')).rows[0].n,0);
 const balances=(await db.query('select name,balance from public.exact_accounts order by name')).rows;
 assert.deepEqual(balances,[{name:'Main',balance:'1000.00'},{name:'Savings',balance:'1000.00'}]);
 await db.query("insert into public.goal_action_plans(user_id,objective_id,account_id,currency,cadence_amount,frequency,start_date) values(auth.uid(),$1,$2,'MYR',100,'monthly','2026-01-31')",[goal,savings]);
 assert.equal((await db.query('select cadence_amount from public.exact_goal_action_plans')).rows[0].cadence_amount,'100.00');
 await identity(other,otherSession);
 assert.equal((await db.query('select * from public.exact_goal_action_plans')).rows.length,0);
 await assert.rejects(db.query("insert into public.goal_action_plans(user_id,objective_id,currency,cadence_amount,frequency,start_date) values(auth.uid(),$1,'MYR',100,'monthly','2026-01-01')",[goal]));
 await assert.rejects(call());
 await identity(user,session);
 await assert.rejects(db.query('delete from public.transfers where id=$1',[transfer]));
 await db.query('delete from public.objective_contributions where id=$1',[request]);
 await db.query("update public.transfers set source_amount=800,destination_amount=800 where id=$1",[transfer]);
 await db.query('delete from public.transfers where id=$1',[transfer]);
 assert.deepEqual((await db.query('select name,balance from public.exact_accounts order by name')).rows,[{name:'Main',balance:'2000.00'},{name:'Savings',balance:'0.00'}]);
 // Future linked transfers must remain intent, with no effective funded cash.
 const future=(await db.query("insert into public.transfers(user_id,source_account_id,destination_account_id,source_currency,destination_currency,source_amount,destination_amount,occurred_at) values(auth.uid(),$1,$2,'MYR','MYR',1000,1000,'2099-01-01') returning id",[main,savings])).rows[0].id;
 const futureContribution=randomUUID();
 await db.query('select public.record_goal_contribution($1,$2,$3,$4,$5,$6,$7,$8)',[futureContribution,goal,'MYR','1000.00',future,savings,'Future source','2000-01-01']);
 assert.equal((await db.query('select effective_amount from public.exact_objective_contributions where id=$1',[futureContribution])).rows[0].effective_amount,'0.00');
 assert.deepEqual((await db.query('select name,balance from public.exact_accounts order by name')).rows,[{name:'Main',balance:'2000.00'},{name:'Savings',balance:'0.00'}]);
 await assert.rejects(db.query('update public.transfers set destination_amount=800 where id=$1',[future]));
 await db.query('delete from public.objective_contributions where id=$1',[futureContribution]);await db.query('delete from public.transfers where id=$1',[future]);
 console.log('PASS goal actions: exact transfer once, safe retries, source correction, owner isolation and planning-only cadence');
 return {user,other,session,otherSession,goal,main,savings};
}
if(process.argv[1]?.endsWith('goal-actions-db-test.mjs')){const db=await PGlite.create();try{await replay(db);await exerciseGoalActions(db);}finally{await db.close();}}
