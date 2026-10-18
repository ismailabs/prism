import { financialClaims } from './lib/financial-test-identity.mjs';
import EmbeddedPostgres from 'embedded-postgres';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join,resolve,delimiter } from 'node:path';
import { randomUUID,createHmac } from 'node:crypto';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import {createServer} from 'node:net';
import assert from 'node:assert/strict';
import { replay, exercise } from './foundations-db-test.mjs';
import { exerciseLedger, exerciseHistoricalLedger, exerciseLedgerConcurrency, exerciseLedgerBoundaries } from './ledger-db-test.mjs';

// No production credentials or production data. This is a real native PostgreSQL
// server with independent connections, not a single-connection simulation.
const directory=await mkdtemp(join(tmpdir(),'prism-postgres-'));
const freePort=()=>new Promise(resolve=>{const listener=createServer();listener.listen(0,'127.0.0.1',()=>{const port=listener.address().port;listener.close(()=>resolve(port));});});
const dbPort=await freePort(),apiPort=await freePort();
const server=new EmbeddedPostgres({databaseDir:join(directory,'data'),user:'postgres',password:randomUUID(),port:dbPort,persistent:true,onLog:()=>{},onError:()=>{}});
const nativeBin=resolve('node_modules/@embedded-postgres/windows-x64/native/bin');
if(process.platform==='win32')server.stop=async()=>{const child=server.process;if(!child)return;if(child.exitCode===null){await new Promise((done,reject)=>{const stop=spawn(join(nativeBin,'pg_ctl.exe'),['-D',join(directory,'data'),'-m','fast','-w','stop'],{stdio:'ignore',windowsHide:true});stop.on('error',reject);stop.on('exit',code=>code===0?done():reject(new Error(`pg_ctl stop failed (${code})`)));});}server.process=undefined;};
const clients=[];
let api;
try {
 await server.initialise();await server.start();
 const connect=async()=>{const client=server.getPgClient();await client.connect();clients.push(client);return client;};
 const admin=await connect();const db={exec:sql=>admin.query(sql),query:(sql,args)=>admin.query(sql,args)};
 await replay(db);await exercise(db);await admin.query('reset role');
 const ledgerFixture=await exerciseLedger(db);await exerciseHistoricalLedger(db);await exerciseLedgerBoundaries(db);await admin.query('reset role');
 await exerciseLedgerConcurrency(admin,await connect(),await connect(),ledgerFixture);
 const user=randomUUID(),session=randomUUID();await admin.query('insert into auth.users(id) values($1)',[user]);await admin.query('insert into auth.sessions(id,user_id) values($1,$2)',[session,user]);
 const tx=(await admin.query("insert into public.transactions(user_id,amount,currency,type) values($1,'1.00','MYR','expense') returning id",[user])).rows[0].id;
 const goal=(await admin.query("insert into public.objectives(user_id,kind,name,currency,target_amount) values($1,'goal','Race','MYR','50.00') returning id",[user])).rows[0].id;
 const debt=(await admin.query("insert into public.person_debts(user_id,direction,counterparty,currency,original_amount) values($1,'i_owe','Race','MYR','50.00') returning id",[user])).rows[0].id;
 const a=await connect(), b=await connect();
 for(const client of [a,b]){await client.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify(await financialClaims(db,{sub:user,session_id:session,aal:'aal2'}))]);await client.query('set role authenticated');await client.query("set statement_timeout='10s'");}
 await a.query('begin');await a.query("insert into public.objective_contributions(user_id,objective_id,currency,transaction_id) values(auth.uid(),$1,'MYR',$2)",[goal,tx]);
 let finished=false;const racing=b.query("insert into public.debt_repayments(user_id,debt_id,currency,transaction_id) values(auth.uid(),$1,'MYR',$2)",[debt,tx]).then(()=>({ok:true}),error=>({ok:false,error})).finally(()=>{finished=true;});
 // Wait until PostgreSQL confirms the second connection is waiting on a lock.
 let blocked=false;for(let attempt=0;attempt<100;attempt++){const result=await admin.query("select wait_event_type from pg_stat_activity where pid=$1",[b.processID]);if(result.rows[0]?.wait_event_type==='Lock'){blocked=true;break;}await new Promise(resolve=>setTimeout(resolve,20));}
 assert(blocked,'The second INSERT must wait on the referenced transaction');assert.equal(finished,false);await a.query('commit');
 const result=await racing;assert.equal(result.ok,false);assert.match(result.error.message,/already linked/);
 assert.equal((await admin.query('select count(*)::int as n from public.debt_repayments where transaction_id=$1',[tx])).rows[0].n,0);
 assert.equal((await admin.query('select count(*)::int as n from public.objective_contributions where transaction_id=$1',[tx])).rows[0].n,1);
 // Concurrent manual repayments serialize on the debt and cannot overpay.
 await a.query('begin');await a.query("insert into public.debt_repayments(user_id,debt_id,currency,amount) values(auth.uid(),$1,'MYR','40.00')",[debt]);
 const overpay=b.query("insert into public.debt_repayments(user_id,debt_id,currency,amount) values(auth.uid(),$1,'MYR','40.00')",[debt]).then(()=>({ok:true}),error=>({ok:false,error}));
 await a.query('commit');assert.equal((await overpay).ok,false);
 console.log('PASS real PostgreSQL: independent connections block cross-table transaction reuse and concurrent overpayment');
 // A deletion started against an empty debt must see a repayment that commits
 // while DELETE waits for its parent lock, rather than cascade it away.
 const guarded=(await admin.query("insert into public.person_debts(user_id,direction,counterparty,currency,original_amount) values($1,'i_owe','Delete race','MYR','50.00') returning id",[user])).rows[0].id;
 const waitForLock=async()=>{for(let i=0;i<100;i++){if((await admin.query('select wait_event_type from pg_stat_activity where pid=$1',[b.processID])).rows[0]?.wait_event_type==='Lock')return;await new Promise(resolve=>setTimeout(resolve,20));}assert.fail('Second request must wait for a database lock');};
 await a.query('begin');await a.query("insert into public.debt_repayments(user_id,debt_id,currency,amount) values(auth.uid(),$1,'MYR','1.00')",[guarded]);
 const deleting=b.query('delete from public.person_debts where id=$1',[guarded]).then(()=>({ok:true}),error=>({ok:false,error}));
 await waitForLock();await a.query('commit');const guardedResult=await deleting;assert.equal(guardedResult.ok,false);assert.match(guardedResult.error.message,/repayment history/);
 assert.equal((await admin.query('select count(*)::int as n from public.debt_repayments where debt_id=$1',[guarded])).rows[0].n,1);
 assert.equal((await admin.query('select count(*)::int as n from public.person_debts where id=$1',[guarded])).rows[0].n,1);
 // Existing request identities must remain idempotent under concurrent retry.
 await admin.query("update public.profiles set financial_timezone='UTC' where id=$1",[user]);
 const batch=randomUUID(),payload=JSON.stringify([{date:'2000-01-01',amount:'0.10',currency:'MYR',type:'expense',description:'Concurrent retry'}]);
 await a.query('begin');assert.equal((await a.query('select public.import_transactions($1::jsonb,$2,false) as n',[payload,batch])).rows[0].n,1);
 const retry=b.query('select public.import_transactions($1::jsonb,$2,false) as n',[payload,batch]);await waitForLock();await a.query('commit');assert.equal((await retry).rows[0].n,0);
 assert.equal((await admin.query("select count(*)::int as n from public.transactions where user_id=$1 and description='Concurrent retry'",[user])).rows[0].n,1);
 const recurringRule=(await admin.query("insert into public.recurring_rules(user_id,description,amount,currency,type,start_date,frequency) values($1,'Concurrent occurrence','0.01','MYR','expense','2000-01-01','monthly') returning id",[user])).rows[0].id;
 await a.query('begin');const occurrence=(await a.query("select public.record_recurring_occurrence($1,0,'2000-01-01') as id",[recurringRule])).rows[0].id;
 const repeat=b.query("select public.record_recurring_occurrence($1,0,'2000-01-01') as id",[recurringRule]);await waitForLock();await a.query('commit');assert.equal((await repeat).rows[0].id,occurrence);
 assert.equal((await admin.query('select next_index from public.recurring_rules where id=$1',[recurringRule])).rows[0].next_index,1);
 console.log('PASS real PostgreSQL: debt deletion waits and preserves committed history; concurrent CSV and occurrence retries produce one event');
 // Verify actual PostgREST serialization, rather than equating SQL text with an
 // HTTP round trip. CI provides the platform binary through PGRST_TEST_BINARY.
 const binary=process.env.PGRST_TEST_BINARY??'.cache/postgrest/postgrest.exe';
 if(!existsSync(binary))throw new Error('PostgREST binary required: set PGRST_TEST_BINARY or install the pinned test binary in .cache/postgrest.');
 const secret=randomUUID()+randomUUID();
 const apiUrl=`http://127.0.0.1:${apiPort}`;
 api=spawn(binary,[],{env:{...process.env,PATH:nativeBin+delimiter+process.env.PATH,PGRST_DB_URI:`postgresql://postgres:${server.options.password}@127.0.0.1:${dbPort}/postgres`,PGRST_DB_SCHEMAS:'public',PGRST_DB_ANON_ROLE:'anon',PGRST_JWT_SECRET:secret,PGRST_SERVER_PORT:String(apiPort),PGRST_SERVER_HOST:'127.0.0.1'},stdio:'ignore',windowsHide:true});
 const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');const unsigned=`${encode({alg:'HS256',typ:'JWT'})}.${encode(await financialClaims(db,{sub:user,session_id:session,role:'authenticated',aal:'aal1',exp:Math.floor(Date.now()/1000)+3600}))}`;const token=`${unsigned}.${createHmac('sha256',secret).update(unsigned).digest('base64url')}`;
 let ready=false;for(let i=0;i<100;i++){try{const response=await fetch(apiUrl);if(response.status<500){ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,50));}assert(ready,'PostgREST must start');
 const headers={Authorization:`Bearer ${token}`,'Content-Type':'application/json',Prefer:'return=representation'};
 const ledgerUnsigned=`${encode({alg:'HS256',typ:'JWT'})}.${encode(await financialClaims(db,{sub:ledgerFixture.user,session_id:ledgerFixture.session,role:'authenticated',aal:'aal2',exp:Math.floor(Date.now()/1000)+3600}))}`;
 const ledgerToken=`${ledgerUnsigned}.${createHmac('sha256',secret).update(ledgerUnsigned).digest('base64url')}`;
 const ledgerHeaders={...headers,Authorization:`Bearer ${ledgerToken}`};
 const ledgerRequest={...ledgerFixture.salary,request_key:'http-ledger-retry'};
 const postLedger=body=>fetch(`${apiUrl}/rpc/post_ledger_event`,{method:'POST',headers:ledgerHeaders,body:JSON.stringify({p:body})});
 const ledgerPost=await postLedger(ledgerRequest);assert.equal(ledgerPost.status,200);const ledgerId=await ledgerPost.json();
 const ledgerRetry=await postLedger(ledgerRequest);assert.equal(ledgerRetry.status,200);assert.equal(await ledgerRetry.json(),ledgerId);
 const ledgerConflict=await postLedger({...ledgerRequest,occurred_at:'2000-02-02T00:00:00Z'});assert.equal(ledgerConflict.status,409);
 const ledgerRead=await fetch(`${apiUrl}/exact_ledger_lines?event_id=eq.${ledgerId}&select=side,amount&order=ordinal`,{headers:ledgerHeaders});assert.equal(ledgerRead.status,200);assert.deepEqual(await ledgerRead.json(),[{side:'debit',amount:'5000.00'},{side:'credit',amount:'5000.00'}]);
 const hugeLedger=await postLedger({...ledgerRequest,request_key:'http-ledger-large',lines:ledgerRequest.lines.map(l=>({...l,amount:'90071992547409.93'}))});assert.equal(hugeLedger.status,200);const hugeLedgerId=await hugeLedger.json();
 for(const currency of ['MYR','USD','EUR','JPY']){const eventId=currency==='MYR'?hugeLedgerId:(await admin.query('select id from public.financial_events where user_id=$1 and request_key=$2',[ledgerFixture.user,`salary:${currency}`])).rows[0].id;const response=await fetch(`${apiUrl}/exact_ledger_lines?event_id=eq.${eventId}&select=amount&order=ordinal`,{headers:ledgerHeaders});assert.equal(response.status,200);assert.deepEqual(await response.json(),Array(2).fill({amount:currency==='JPY'?'9007199254740993':'90071992547409.93'}));}
 const ledgerDenied=await fetch(`${apiUrl}/exact_ledger_lines?event_id=eq.${ledgerId}`,{headers});assert.equal(ledgerDenied.status,200);assert.deepEqual(await ledgerDenied.json(),[]);
 const ledgerPrecision=await postLedger({...ledgerRequest,request_key:'http-ledger-precision',lines:ledgerRequest.lines.map(l=>({...l,amount:'1.001'}))});assert.equal(ledgerPrecision.status,400);
 const ledgerDirect=await fetch(`${apiUrl}/journal_lines`,{method:'POST',headers:ledgerHeaders,body:JSON.stringify({user_id:ledgerFixture.user})});assert.equal(ledgerDirect.status,403);
 const preciseRequest={...ledgerRequest,request_key:'http-microseconds',occurred_at:'2000-02-29T23:59:59.000099+08:00'};
 const precise=await postLedger(preciseRequest);assert.equal(precise.status,200);const preciseId=await precise.json();
 const preciseRetry=await postLedger(preciseRequest);assert.equal(preciseRetry.status,200);assert.equal(await preciseRetry.json(),preciseId);
 const preciseRead=await fetch(`${apiUrl}/exact_ledger_lines?event_id=eq.${preciseId}&select=occurred_at&order=ordinal`,{headers:ledgerHeaders});assert.equal(preciseRead.status,200);assert.deepEqual(await preciseRead.json(),Array(2).fill({occurred_at:'2000-02-29T15:59:59.000099Z'}));
 const ledgerCounts=async()=> (await admin.query(`select
   (select count(*)::int from public.ledger_accounts) as accounts,
   (select count(*)::int from public.financial_events) as events,
   (select count(*)::int from public.journals) as journals,
   (select count(*)::int from public.journal_lines) as lines,
   (select count(*)::int from public.ledger_allocations) as allocations,
   (select count(*)::int from public.transactions) as legacy`)).rows[0];
 const beforeDenied=await ledgerCounts();
 for(const [label,claims] of [
   ['missing-aal',{sub:ledgerFixture.user,session_id:ledgerFixture.session}],
   ['null-aal',{sub:ledgerFixture.user,session_id:ledgerFixture.session,aal:null}],
   ['aal1',{sub:ledgerFixture.user,session_id:ledgerFixture.session,aal:'aal1'}],
   ['missing-session',{sub:ledgerFixture.user,aal:'aal2'}],
   ['invalid-session',{sub:ledgerFixture.user,session_id:randomUUID(),aal:'aal2'}],
   ['wrong-session-owner',{sub:ledgerFixture.user,session_id:session,aal:'aal2'}],
 ]){
   const unsignedDenied=`${encode({alg:'HS256',typ:'JWT'})}.${encode({...claims,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})}`;
   const deniedToken=`${unsignedDenied}.${createHmac('sha256',secret).update(unsignedDenied).digest('base64url')}`;
   const deniedHeaders={...headers,Authorization:`Bearer ${deniedToken}`};
   for(const [rpc,p] of [
     ['create_ledger_account',{code:`denied-http:${label}`,classification:'asset',currency:'MYR'}],
     ['post_ledger_event',{...ledgerRequest,request_key:`denied-http:${label}`}],
   ]){
     const response=await fetch(`${apiUrl}/rpc/${rpc}`,{method:'POST',headers:deniedHeaders,body:JSON.stringify({p})});
     assert.equal(response.status,403,`${rpc}:${label}`);assert.equal((await response.json()).code,'42501');
     assert.deepEqual(await ledgerCounts(),beforeDenied,`${rpc}:${label} persistent writes`);
   }
   const hidden=await fetch(`${apiUrl}/exact_ledger_lines?select=id`,{headers:deniedHeaders});assert.equal(hidden.status,200);assert.deepEqual(await hidden.json(),[]);
 }
 for(const occurred_at of ['2000-02-29T15:59:59.0000991Z','2000-02-30T00:00:00Z','2000-02-29T24:00:00Z']){
   const response=await postLedger({...ledgerRequest,request_key:'denied-http-precision',occurred_at});assert.equal(response.status,400);
   assert.deepEqual(await ledgerCounts(),beforeDenied);
 }
 console.log('PASS P1 actual HTTP: microsecond offset/string round trip and retry; both RPCs deny NULL/FALSE/session/owner/MFA, RLS hides rows, all ledger and legacy counts unchanged; unsupported precision rejected');
 console.log('PASS actual ledger HTTP: invoker RPC posts/retries once, conflicting payload 409, exact text reads, cross-user rows hidden, invalid precision/direct writes rejected');
 const saved=await fetch(`${apiUrl}/transactions`,{method:'POST',headers,body:JSON.stringify({user_id:user,amount:'90071992547409.93',currency:'MYR',type:'income',description:'API exact round trip'})});assert.equal(saved.status,201,await saved.text());
 const exact=await fetch(`${apiUrl}/exact_transactions?description=eq.API%20exact%20round%20trip&select=amount`,{headers});assert.equal(exact.status,200);assert.deepEqual(await exact.json(),[{amount:'90071992547409.93'}]);
 const anon=await fetch(`${apiUrl}/exact_transactions?select=amount`);assert([401,403].includes(anon.status));
 const amount='90071992547409.93';
 const post=async(table,values)=>{const response=await fetch(`${apiUrl}/${table}?select=id`,{method:'POST',headers,body:JSON.stringify({user_id:user,...values})});if(response.status!==201)throw new Error(`${table}: ${response.status} ${await response.text()}`);return (await response.json())[0].id;};
 const first=await post('accounts',{name:'Exact A',currency:'MYR',opening_balance:amount});
 const second=await post('accounts',{name:'Exact B',currency:'MYR',opening_balance:'0.00'});
 const objective=await post('objectives',{kind:'savings',name:'Exact target',currency:'MYR',target_amount:amount});
 const contribution=await post('objective_contributions',{objective_id:objective,currency:'MYR',amount});
 const milestone=await post('objective_milestones',{objective_id:objective,name:'Exact milestone',amount});
 const person=await post('person_debts',{direction:'i_owe',counterparty:'Exact principal',currency:'MYR',original_amount:amount});
 const repayment=await post('debt_repayments',{debt_id:person,currency:'MYR',amount,account_id:first});
 const transfer=await post('transfers',{source_account_id:first,destination_account_id:second,source_currency:'MYR',destination_currency:'MYR',source_amount:amount,destination_amount:amount});
 const category=await post('categories',{name:'Exact budget',type:'expense',color:'#4265ee'});
 const budget=await post('monthly_budgets',{category_id:category,currency:'MYR',month:'2026-09-01',amount});
 const rule=await post('recurring_rules',{description:'Exact recurring',currency:'MYR',type:'expense',start_date:'2026-09-01',frequency:'monthly',amount});
 const cashBefore=(await (await fetch(`${apiUrl}/exact_accounts?id=eq.${first}&select=balance`,{headers})).json())[0].balance;
 const reservePlan=await post('reserve_plans',{month:'2026-10-01',currency:'MYR',name:'Exact reserve assumption',amount});
 const debtPlan=await post('debt_plans',{debt_id:person,currency:'MYR',debt_type:'personal',scenario_principal:amount,balance_as_of:'2026-10-01',apr_bps:1200,rate_mode:'fixed',minimum_payment:amount,frequency:'monthly',first_payment_date:'2026-10-31'});
 for(const [table,id,field] of [['accounts',first,'opening_balance'],['objectives',objective,'target_amount'],['objective_contributions',contribution,'effective_amount'],['objective_milestones',milestone,'amount'],['person_debts',person,'original_amount'],['debt_repayments',repayment,'effective_amount'],['transfers',transfer,'source_amount'],['transfers',transfer,'destination_amount'],['monthly_budgets',budget,'amount'],['recurring_rules',rule,'amount'],['reserve_plans',reservePlan,'amount'],['debt_plans',debtPlan,'scenario_principal'],['debt_plans',debtPlan,'minimum_payment']]){
   const response=await fetch(`${apiUrl}/exact_${table}?id=eq.${id}&select=${field}`,{headers});assert.equal(response.status,200);assert.deepEqual(await response.json(),[{[field]:amount}]);
 }
 assert.equal((await (await fetch(`${apiUrl}/exact_accounts?id=eq.${first}&select=balance`,{headers})).json())[0].balance,cashBefore,'Saving planning assumptions must not affect cash');
 const eraseRepayment=await fetch(`${apiUrl}/debt_repayments?id=eq.${repayment}`,{method:'DELETE',headers});assert.equal(eraseRepayment.status,400);assert.match(await eraseRepayment.text(),/audited reversal/);
 const eraseDebt=await fetch(`${apiUrl}/person_debts?id=eq.${person}`,{method:'DELETE',headers});assert.equal(eraseDebt.status,400);assert.match(await eraseDebt.text(),/cannot be deleted/);
 console.log('PASS Phase 4 PostgREST HTTP: planning assumptions round-trip exact text, preserve cash and reject history erasure');
 const badPrecision=await fetch(`${apiUrl}/transactions`,{method:'POST',headers,body:JSON.stringify({user_id:user,amount:'1.001',currency:'MYR',type:'income'})});assert.equal(badPrecision.status,400);
 const yenAccount=await post('accounts',{name:'Legacy JPY scale',currency:'JPY',opening_balance:'100.00'});
 const yenTx=await post('transactions',{currency:'JPY',amount:'1.00',type:'expense',account_id:yenAccount});
 const yenObjective=await post('objectives',{kind:'goal',name:'JPY goal',currency:'JPY',target_amount:'200.00'});
 const yenMilestone=await post('objective_milestones',{objective_id:yenObjective,name:'JPY milestone',amount:'50.00'});
 for(const [table,id,field,value] of [['accounts',yenAccount,'opening_balance','100'],['accounts',yenAccount,'balance','99'],['transactions',yenTx,'amount','1'],['objectives',yenObjective,'target_amount','200'],['objective_milestones',yenMilestone,'amount','50']]){
   const response=await fetch(`${apiUrl}/exact_${table}?id=eq.${id}&select=${field}`,{headers});assert.equal(response.status,200);assert.deepEqual(await response.json(),[{[field]:value}]);
 }
 console.log('PASS actual PostgREST HTTP write/read: 90071992547409.93 survives JSON as text; anonymous access denied');
 console.log('PASS actual PostgREST HTTP: every money-bearing entity round-trips exact text; excess decimal precision rejected');
 console.log('PASS actual PostgREST HTTP: legacy JPY redundant fractional zeros become canonical integer text without changing value');
 for(const currency of ['USD','EUR']){
   const id=await post('transactions',{currency,amount:'9999999999999999.99',type:'income'});
   const response=await fetch(`${apiUrl}/exact_transactions?id=eq.${id}&select=amount`,{headers});assert.equal(response.status,200);assert.deepEqual(await response.json(),[{amount:'9999999999999999.99'}]);
 }
 const protectedDelete=await fetch(`${apiUrl}/person_debts?id=eq.${person}`,{method:'DELETE',headers});assert.equal(protectedDelete.status,400);assert.match(await protectedDelete.text(),/repayment history/);
 assert.equal((await admin.query('select count(*)::int as n from public.debt_repayments where id=$1',[repayment])).rows[0].n,1);
 const emptyDebt=await post('person_debts',{direction:'i_owe',counterparty:'Empty HTTP debt',currency:'MYR',original_amount:'1.00'});
 const emptyDelete=await fetch(`${apiUrl}/person_debts?id=eq.${emptyDebt}`,{method:'DELETE',headers});assert([200,204].includes(emptyDelete.status));
 console.log('PASS actual PostgREST HTTP: four native currencies retain exact strings; parent history deletion rejected and empty debt deletion allowed');
 const deleted=await fetch(`${apiUrl}/rpc/delete_own_account`,{method:'POST',headers,body:JSON.stringify({confirmation:'DELETE'})});assert([200,204].includes(deleted.status),await deleted.text());
 assert.equal((await admin.query('select count(*)::int as n from auth.users where id=$1',[user])).rows[0].n,0);
 for(const table of ['accounts','transfers','transactions','objectives','objective_contributions','objective_milestones','person_debts','debt_repayments','monthly_budgets','recurring_rules','reserve_plans','debt_plans'])assert.equal((await admin.query(`select count(*)::int as n from public.${table} where user_id=$1`,[user])).rows[0].n,0,table);
 console.log('PASS actual PostgREST HTTP: confirmed self-deletion cascades through transfers, budgets, recurring rules and all financial history');
 const ledgerDeleted=await fetch(`${apiUrl}/rpc/delete_own_account`,{method:'POST',headers:ledgerHeaders,body:JSON.stringify({confirmation:'DELETE'})});assert([200,204].includes(ledgerDeleted.status),await ledgerDeleted.text());
 for(const table of ['ledger_accounts','financial_events','journals','journal_lines','ledger_allocations'])assert.equal((await admin.query(`select count(*)::int as n from public.${table} where user_id=$1`,[ledgerFixture.user])).rows[0].n,0,table);
 console.log('PASS actual ledger HTTP: AAL2 confirmed whole-account erasure removes ledger rows through the existing privileged Auth path');
}catch(error){console.error(error?.message??String(error));process.exitCode=1;}finally{if(api&&api.exitCode===null){const exited=new Promise(resolve=>api.once('exit',resolve));api.kill();await exited;}for(const client of clients)await client.end();await server.stop();}
