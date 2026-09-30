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
 const user=randomUUID(),session=randomUUID();await admin.query('insert into auth.users(id) values($1)',[user]);await admin.query('insert into auth.sessions(id,user_id) values($1,$2)',[session,user]);
 const tx=(await admin.query("insert into public.transactions(user_id,amount,currency,type) values($1,'1.00','MYR','expense') returning id",[user])).rows[0].id;
 const goal=(await admin.query("insert into public.objectives(user_id,kind,name,currency,target_amount) values($1,'goal','Race','MYR','50.00') returning id",[user])).rows[0].id;
 const debt=(await admin.query("insert into public.person_debts(user_id,direction,counterparty,currency,original_amount) values($1,'i_owe','Race','MYR','50.00') returning id",[user])).rows[0].id;
 const a=await connect(), b=await connect();
 for(const client of [a,b]){await client.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:user,session_id:session,aal:'aal1'})]);await client.query('set role authenticated');await client.query("set statement_timeout='10s'");}
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
 // Verify actual PostgREST serialization, rather than equating SQL text with an
 // HTTP round trip. CI provides the platform binary through PGRST_TEST_BINARY.
 const binary=process.env.PGRST_TEST_BINARY??'.cache/postgrest/postgrest.exe';
 if(!existsSync(binary))throw new Error('PostgREST binary required: set PGRST_TEST_BINARY or install the pinned test binary in .cache/postgrest.');
 const secret=randomUUID()+randomUUID();
 const apiUrl=`http://127.0.0.1:${apiPort}`;
 api=spawn(binary,[],{env:{...process.env,PATH:nativeBin+delimiter+process.env.PATH,PGRST_DB_URI:`postgresql://postgres:${server.options.password}@127.0.0.1:${dbPort}/postgres`,PGRST_DB_SCHEMAS:'public',PGRST_DB_ANON_ROLE:'anon',PGRST_JWT_SECRET:secret,PGRST_SERVER_PORT:String(apiPort),PGRST_SERVER_HOST:'127.0.0.1'},stdio:'ignore',windowsHide:true});
 const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');const unsigned=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:user,session_id:session,role:'authenticated',aal:'aal1',exp:Math.floor(Date.now()/1000)+3600})}`;const token=`${unsigned}.${createHmac('sha256',secret).update(unsigned).digest('base64url')}`;
 let ready=false;for(let i=0;i<100;i++){try{const response=await fetch(apiUrl);if(response.status<500){ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,50));}assert(ready,'PostgREST must start');
 const headers={Authorization:`Bearer ${token}`,'Content-Type':'application/json',Prefer:'return=representation'};
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
 for(const [table,id,field] of [['accounts',first,'opening_balance'],['objectives',objective,'target_amount'],['objective_contributions',contribution,'effective_amount'],['objective_milestones',milestone,'amount'],['person_debts',person,'original_amount'],['debt_repayments',repayment,'effective_amount'],['transfers',transfer,'source_amount'],['transfers',transfer,'destination_amount'],['monthly_budgets',budget,'amount'],['recurring_rules',rule,'amount']]){
   const response=await fetch(`${apiUrl}/exact_${table}?id=eq.${id}&select=${field}`,{headers});assert.equal(response.status,200);assert.deepEqual(await response.json(),[{[field]:amount}]);
 }
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
 const deleted=await fetch(`${apiUrl}/rpc/delete_own_account`,{method:'POST',headers,body:JSON.stringify({confirmation:'DELETE'})});assert([200,204].includes(deleted.status),await deleted.text());
 assert.equal((await admin.query('select count(*)::int as n from auth.users where id=$1',[user])).rows[0].n,0);
 for(const table of ['accounts','transfers','transactions','objectives','objective_contributions','objective_milestones','person_debts','debt_repayments','monthly_budgets','recurring_rules'])assert.equal((await admin.query(`select count(*)::int as n from public.${table} where user_id=$1`,[user])).rows[0].n,0,table);
 console.log('PASS actual PostgREST HTTP: confirmed self-deletion cascades through transfers, budgets, recurring rules and all financial history');
}catch(error){console.error(error?.message??String(error));process.exitCode=1;}finally{if(api&&api.exitCode===null){const exited=new Promise(resolve=>api.once('exit',resolve));api.kill();await exited;}for(const client of clients)await client.end();await server.stop();}
