import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
const db = await PGlite.create();
const sql = async path => { const source=await readFile(path,'utf8'); try {return await db.exec(source);} catch(e) {console.error(path,e.position,e.internalPosition,e.internalQuery); if(e.position)console.error(source.slice(Math.max(0,Number(e.position)-180),Number(e.position)+100));throw e;} };
const checks=[];
async function check(name,fn) { await fn(); checks.push(name); console.log('PASS '+name); }
try {
 await sql('supabase/tests/auth-fixture.sql');
 await sql('supabase/baseline/phase1-observed.sql');
 const u1=randomUUID(),u2=randomUUID(),s1=randomUUID(),s2=randomUUID(),legacy=randomUUID();
 await db.query('insert into auth.users(id) values($1),($2)',[u1,u2]);
 await db.query('insert into auth.sessions(id,user_id) values($1,$2),($3,$4)',[s1,u1,s2,u2]);
 await db.query("insert into public.transactions(id,user_id,amount,currency,type,description,transaction_date) values($1,$2,90071992547409.93,'MYR','income','Legacy exact','2024-01-31T23:59:00Z')",[legacy,u1]);
 const before=(await db.query('select to_jsonb(t) as row from public.transactions t')).rows;
 await sql('supabase/migrations/20260928000100_financial_foundation.sql');
 await check('legacy records unchanged and exactly copied',async()=>{
   assert.deepEqual((await db.query('select to_jsonb(t) as row from public.transactions t')).rows,before);
   const row=(await db.query('select amount::text,account_id,legacy_id,occurred_at::text from public.financial_events')).rows[0];
   assert.equal(row.amount,'90071992547409.93');assert.equal(row.account_id,null);assert.equal(row.legacy_id,legacy);
 });
 async function identity(user=u1,session=s1,extra={}) { await db.exec('reset role'); await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:user,session_id:session,aal:'aal1',...extra})]); await db.exec('set role authenticated'); }
 const rpc=async(name,p)=> (await db.query(`select public.${name}($1::jsonb) as result`,[JSON.stringify(p)])).rows[0].result;
 await identity();
 const a=await rpc('finance_save_account',{name:'Cash',type:'cash',currency:'MYR',opening_balance:'1000.10',opening_date:'2020-01-01'});
 const b=await rpc('finance_save_account',{name:'Savings',type:'savings',currency:'MYR',opening_balance:'0',opening_date:'2020-01-01'});
 const loan=await rpc('finance_save_account',{name:'Loan',type:'loan',currency:'MYR',opening_balance:'-500',opening_date:'2020-01-01'});
 const base={kind:'expense',amount:'0.10',currency:'MYR',account_id:a.id,business_date:'2026-01-01',description:'Coffee',tags:[]};
 const snapshot=async()=> (await db.query('select public.finance_snapshot() as result')).rows[0].result;
 await check('exact posting, update, stale-write rejection and void audit',async()=>{
  const e=await rpc('finance_save_event',base);
  assert.equal((await snapshot()).accounts.find(x=>x.id===a.id).balance,'1000.00');
  const edit=await rpc('finance_save_event',{...base,id:e.id,version:e.version,amount:'0.20'});
  await assert.rejects(rpc('finance_save_event',{...base,id:e.id,version:e.version}));
  await db.query('select public.finance_void_event($1,$2)',[e.id,edit.version]);
  assert.equal((await snapshot()).accounts.find(x=>x.id===a.id).balance,'1000.10');
  assert.equal((await db.query('select count(*)::int as n from public.event_audit where event_id=$1',[e.id])).rows[0].n,3);
 });
 await check('transfer is atomic and neutral; debt splits principal and interest',async()=>{
  await rpc('finance_save_event',{...base,kind:'transfer',amount:'100',destination_account_id:b.id});
  let s=await snapshot();assert.equal(s.accounts.find(x=>x.id===a.id).balance,'900.10');assert.equal(s.accounts.find(x=>x.id===b.id).balance,'100');
  await rpc('finance_save_event',{...base,kind:'debt_payment',amount:'55',principal:'50',interest:'5',destination_account_id:loan.id});
  s=await snapshot();assert.equal(s.accounts.find(x=>x.id===loan.id).balance,'-450');assert.equal(s.accounts.find(x=>x.id===a.id).balance,'845.10');
  await assert.rejects(rpc('finance_save_event',{...base,kind:'debt_payment',amount:'55',principal:'49',interest:'5',destination_account_id:loan.id}));
  await assert.rejects(rpc('finance_save_event',{...base,kind:'transfer',destination_account_id:a.id}));
 });
 await check('database rejects precision loss, currency mismatch and unauthorized direct writes',async()=>{
  await assert.rejects(rpc('finance_save_event',{...base,amount:'0.001'}));
  await assert.rejects(rpc('finance_save_event',{...base,amount:'1e4'}));
  await assert.rejects(rpc('finance_save_event',{...base,currency:'USD'}));
  await assert.rejects(db.query('update public.financial_events set amount=1'));
  await assert.rejects(db.query('delete from public.financial_events'));
 });
 await check('two users cannot read, modify, reassign, or link each other’s data',async()=>{
  await identity(u2,s2);
  assert.equal((await snapshot()).events.length,0);assert.equal((await db.query('select * from public.accounts')).rows.length,0);
  await assert.rejects(rpc('finance_save_event',base));
  await assert.rejects(rpc('finance_save_account',{...a,version:1,name:'Stolen'}));
  await assert.rejects(db.query('select public.finance_void_event($1,1)',[legacy]));
  await identity();
 });
 await check('CSV atomicity, duplicate handling and retry idempotency',async()=>{
  const id=randomUUID(); const row={...base,amount:'12.34',description:'Imported'};
  const run=async(rows)=> (await db.query('select public.finance_import($1,$2,$3::jsonb,true) as result',[id,'fixture.csv',JSON.stringify(rows)])).rows[0].result;
  const first=await run([row,row]);assert.equal(first.imported_count,1);assert.equal(first.skipped_count,1);
  assert.deepEqual(await run([row,row]),first);
  await assert.rejects(run([row]));
  const old=(await snapshot()).events.length;
  await assert.rejects(db.query("select public.finance_import($1,'invalid.csv',$2::jsonb,true)",[randomUUID(),JSON.stringify([{...row,description:'Will roll back'},{...row,amount:'NaN'}])]));
  assert.equal((await snapshot()).events.length,old);
 });
 await check('recurring dates and confirmations are deterministic and retry safe',async()=>{
  assert.equal((await db.query("select prism_private.recurring_date('2024-01-31','monthly',1,1)::text as d").catch(()=>({rows:[]}))).rows.length,0); // private functions not callable
  const r=await rpc('finance_save_recurring',{name:'Monthly rent',template:{...base,amount:'10'},frequency:'monthly',interval_count:1,start_date:'2024-01-31'});
  const first=(await db.query('select public.finance_confirm_recurring($1,0) as result',[r.id])).rows[0].result;
  const retry=(await db.query('select public.finance_confirm_recurring($1,0) as result',[r.id])).rows[0].result;
  assert.equal(first.id,retry.id);assert.equal((await snapshot()).recurring[0].next_date,'2024-02-29');
  await assert.rejects(db.query('select public.finance_confirm_recurring($1,3)',[r.id]));
 });
 await check('revoked sessions, anonymous users and MFA AAL1 are denied',async()=>{
  await identity(u1,randomUUID()); await assert.rejects(snapshot());
  await identity(u1,s1,{is_anonymous:true}); await assert.rejects(snapshot());
  await db.exec('reset role'); await db.query("insert into auth.mfa_factors values($1,$2,'verified')",[randomUUID(),u1]);
  await identity();await assert.rejects(snapshot());
  await identity(u1,s1,{aal:'aal2'});assert((await snapshot()).events.length>0);
  await db.exec('reset role; set role anon');await assert.rejects(snapshot());
 });
 console.log(`Database: ${checks.length} integration groups passed.`);
} catch(error) { console.error(error.message); process.exitCode=1; } finally { await db.close(); }
