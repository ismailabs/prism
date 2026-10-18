import { financialClaims } from './lib/financial-test-identity.mjs';
import EmbeddedPostgres from 'embedded-postgres';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,delimiter} from 'node:path';
import {randomUUID,createHmac} from 'node:crypto';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {existsSync} from 'node:fs';
import {replay} from './foundations-db-test.mjs';
import {exerciseActions} from './actions-db-test.mjs';
const freePort=()=>new Promise(done=>{const socket=createServer();socket.listen(0,'127.0.0.1',()=>{const port=socket.address().port;socket.close(()=>done(port));});});
const directory=await mkdtemp(join(tmpdir(),'prism-actions-')),port=await freePort(),apiPort=await freePort();
const server=new EmbeddedPostgres({databaseDir:join(directory,'data'),user:'postgres',password:randomUUID(),port,persistent:true,onLog:()=>{},onError:()=>{}});
const nativeBin=resolve('node_modules/@embedded-postgres/windows-x64/native/bin');
if(process.platform==='win32')server.stop=async()=>{if(!server.process)return;await new Promise((done,reject)=>{const stop=spawn(join(nativeBin,'pg_ctl.exe'),['-D',join(directory,'data'),'-m','fast','-w','stop'],{stdio:'ignore',windowsHide:true});stop.on('error',reject);stop.on('exit',code=>code===0?done():reject(new Error('Local PostgreSQL stop failed')));});server.process=undefined;};
const clients=[],checks=[];let api;
try{
 await server.initialise();await server.start();
 const connect=async()=>{const client=server.getPgClient();await client.connect();clients.push(client);return client;};
 const admin=await connect(),db={exec:sql=>admin.query(sql),query:(sql,args)=>admin.query(sql,args)};
 await replay(db);const f=await exerciseActions(db);checks.push('all SQL ownership, linked goal, note/reminder and exact-cash checks on native PostgreSQL');
 const identity=async(client,user,session,aal='aal2')=>{await client.query('reset role');await client.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify(await financialClaims(db,{sub:user,session_id:session,aal}))]);await client.query('set role authenticated');};
 const a=await connect(),b=await connect();for(const client of [a,b]){await identity(client,f.user,f.session);await client.query("set statement_timeout='15s'");}
 const transfer=(await admin.query("insert into public.transfers(user_id,source_account_id,destination_account_id,source_currency,destination_currency,source_amount,destination_amount,occurred_at) values($1,$2,$3,'MYR','MYR',1000,1000,'2026-01-01') returning id",[f.user,f.main,f.savings])).rows[0].id;
 const request=randomUUID(),params=[request,f.goal,'MYR','1000.00',transfer,f.savings,'Native retry','2026-01-01T00:00Z'];
 await a.query('begin');await a.query('select public.record_goal_contribution($1,$2,$3,$4,$5,$6,$7,$8)',params);
 const retry=b.query('select public.record_goal_contribution($1,$2,$3,$4,$5,$6,$7,$8) as id',params);
 let blocked=false;for(let attempt=0;attempt<100;attempt++){const status=(await admin.query('select wait_event_type from pg_stat_activity where pid=$1',[b.processID])).rows[0];if(status?.wait_event_type==='Lock'){blocked=true;break;}await new Promise(done=>setTimeout(done,20));}assert(blocked,'Concurrent retry must wait on its actual source/identity lock');await a.query('commit');assert.equal((await retry).rows[0].id,request);
 assert.equal((await admin.query('select count(*)::int n from public.objective_contributions where transfer_id=$1',[transfer])).rows[0].n,1);checks.push('observed lock and single contribution under concurrent retry');
 await a.query('begin');await a.query("insert into public.action_receipts(user_id,occurrence_key,state) values(auth.uid(),'native-same','read') on conflict(user_id,occurrence_key) do update set state=excluded.state");
 const receipt=b.query("insert into public.action_receipts(user_id,occurrence_key,state) values(auth.uid(),'native-same','dismissed') on conflict(user_id,occurrence_key) do update set state=excluded.state");await a.query('commit');await receipt;assert.equal((await admin.query("select count(*)::int n from public.action_receipts where occurrence_key='native-same'")).rows[0].n,1);checks.push('concurrent receipt upserts deduplicate');
 const binary=process.env.PGRST_TEST_BINARY??'.cache/postgrest/postgrest.exe';if(!existsSync(binary))throw new Error('Provide the local pinned PostgREST test binary.');
 const secret=randomUUID()+randomUUID(),url=`http://127.0.0.1:${apiPort}`;
 api=spawn(binary,[],{env:{...process.env,PATH:nativeBin+delimiter+process.env.PATH,PGRST_DB_URI:`postgresql://postgres:${server.options.password}@127.0.0.1:${port}/postgres`,PGRST_DB_SCHEMAS:'public',PGRST_DB_ANON_ROLE:'anon',PGRST_JWT_SECRET:secret,PGRST_SERVER_PORT:String(apiPort),PGRST_SERVER_HOST:'127.0.0.1'},stdio:'ignore',windowsHide:true});
 for(let i=0;;i++){try{if((await fetch(url)).status<500)break;}catch{}if(i>=100)throw new Error('Local PostgREST failed to start');await new Promise(done=>setTimeout(done,50));}
 const headers=async(user,session,aal='aal2')=>{const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url');const unsigned=`${encode({alg:'HS256',typ:'JWT'})}.${encode(await financialClaims(db,{sub:user,session_id:session,role:'authenticated',aal,exp:Math.floor(Date.now()/1000)+3600}))}`;return {Authorization:`Bearer ${unsigned}.${createHmac('sha256',secret).update(unsigned).digest('base64url')}`,'Content-Type':'application/json',Prefer:'return=representation'};};
 const own=await headers(f.user,f.session),other=await headers(f.other,f.otherSession);
 const create=await fetch(`${url}/financial_notes`,{method:'POST',headers:own,body:JSON.stringify({user_id:f.user,title:'HTTP private context',body:'Exact round trip',tags:['private'],objective_id:f.goal})});assert.equal(create.status,201);const note=(await create.json())[0];
 const counted=await fetch(`${url}/financial_notes?user_id=eq.${f.user}`,{headers:{...own,Prefer:'count=exact',Range:'0-24',Origin:'http://127.0.0.1:5173'}});assert.equal(counted.status,200);assert.match(counted.headers.get('content-range')??'',/\/\d+$/);assert.match(counted.headers.get('access-control-expose-headers')??'',/Content-Range/i);checks.push('owned exact page count and real browser-origin CORS header exposure');
 const search=await fetch(`${url}/financial_notes?search_document=plfts(simple).HTTP`,{headers:other});assert.equal(search.status,200);assert.deepEqual(await search.json(),[]);
 const denied=await fetch(`${url}/financial_notes`,{method:'POST',headers:other,body:JSON.stringify({user_id:f.other,title:'Foreign source',objective_id:f.goal})});assert.equal(denied.status,409);
 const patch=await fetch(`${url}/financial_notes?id=eq.${note.id}`,{method:'PATCH',headers:other,body:JSON.stringify({body:'Foreign edit'})});assert.equal(patch.status,200);assert.deepEqual(await patch.json(),[]);
 const deletion=await fetch(`${url}/financial_notes?id=eq.${note.id}`,{method:'DELETE',headers:other});assert.equal(deletion.status,200);assert.deepEqual(await deletion.json(),[]);
 const roundTrip=await fetch(`${url}/exact_goal_action_plans`,{headers:own});assert.equal(roundTrip.status,200);assert.equal((await roundTrip.json())[0].cadence_amount,'100.00');
 for(const resource of ['financial_notes','financial_reminders','action_receipts','action_preferences','exact_goal_action_plans']){
  assert.equal((await fetch(`${url}/${resource}`)).status,401);
  const revoked=await fetch(`${url}/${resource}`,{headers:await headers(f.user,randomUUID())});assert.equal(revoked.status,200);assert.deepEqual(await revoked.json(),[]);
 }
 await admin.query("insert into auth.mfa_factors(id,user_id,status) values($1,$2,'verified')",[randomUUID(),f.user]);
 for(const aal of ['aal1',null]){const deniedMfa=await fetch(`${url}/financial_notes`,{headers:headers(f.user,f.session,aal)});assert.equal(deniedMfa.status,200);assert.deepEqual(await deniedMfa.json(),[]);}
 const allowedMfa=await fetch(`${url}/financial_notes`,{headers:headers(f.user,f.session,'aal2')});assert.equal(allowedMfa.status,200);assert((await allowedMfa.json()).length>0);checks.push('real HTTP exact text, owner CRUD/search/link denial, anon/revoked/MFA truth table');
 await mkdir('artifacts/phase5',{recursive:true});await writeFile('artifacts/phase5/native-verification.json',JSON.stringify({environment:'synthetic native PostgreSQL and PostgREST on loopback',checks,hostedVerified:false},null,2)+'\n');console.log('PASS Phase 5 native/HTTP: '+checks.join('; '));
}finally{if(api)api.kill();for(const client of clients)await client.end().catch(()=>{});await server.stop();}
