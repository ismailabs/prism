import { type Page, type Route } from '@playwright/test';

const userId = '11111111-1111-4111-8111-111111111111';
export const supabaseUrl=process.env.PRISM_E2E_SUPABASE_URL ?? 'https://fixture.supabase.co';
export const authStorageKey=`sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`;
const now = Math.floor(Date.now() / 1000);
const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
const accessToken = `${encode({ alg: 'none', typ: 'JWT' })}.${encode({ sub: userId, email: 'test@example.com', role: 'authenticated', aud: 'authenticated', aal: 'aal1', session_id: '22222222-2222-4222-8222-222222222222', exp: now + 3600 })}.fixture`;
const user = { id: userId, email: 'test@example.com', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, identities: [], created_at: new Date().toISOString() };
export const rows: Record<string, unknown[]> = {
  profiles: [{ id:userId, username:'Test member', currency:'MYR', language:'en', theme:'light', mfa_enabled:false, financial_timezone:'Asia/Kuala_Lumpur', default_analysis_period:'month', created_at:new Date().toISOString() }],
  categories: [], payment_methods: [],
  transactions: [{ id:'tx-1', user_id:userId, amount:'25.00', currency:'MYR', type:'expense', category_id:null, payment_method_id:null, account_id:'account-1', description:'Groceries', transaction_date:'2026-09-20T00:00:00Z', created_at:'2026-09-20T00:00:00Z' }],
  accounts: [{ id:'account-1', user_id:userId, name:'Everyday account', currency:'MYR', opening_balance:'100.00', archived:false, created_at:'2026-09-01T00:00:00Z' },{ id:'account-2', user_id:userId, name:'Empty account', currency:'USD', opening_balance:'50.00', archived:false, created_at:'2026-09-01T00:00:00Z' }],
  objectives: [{ id:'goal-1', user_id:userId, kind:'goal', name:'Emergency fund', notes:'', category:'Safety', priority:'high', target_amount:'500.00', currency:'MYR', target_date:null, status:'active', created_at:'', updated_at:'' },{ id:'save-1', user_id:userId, kind:'savings', name:'Travel fund', notes:'', category:'Travel', priority:'normal', target_amount:'300.00', currency:'MYR', target_date:null, status:'active', created_at:'', updated_at:'' }],
  objective_contributions: [], objective_milestones: [],
  person_debts: [{ id:'debt-1', user_id:userId, direction:'i_owe', counterparty:'Alex', original_amount:'80.00', currency:'MYR', due_date:null, notes:'', created_at:'', updated_at:'' }],
  debt_repayments: [], transfers: [], monthly_budgets: [], recurring_rules: [],
};

const baseline=structuredClone(rows);
export async function mockSignedInApp(page: Page) {
  for(const key of Object.keys(rows))rows[key]=structuredClone(baseline[key]);
  await page.addInitScript(({ token, authUser, storageKey }) => {
    localStorage.setItem(storageKey, JSON.stringify({ access_token:token, refresh_token:'fixture-refresh', expires_at:Math.floor(Date.now()/1000)+3600, expires_in:3600, token_type:'bearer', user:authUser }));
  }, { token:accessToken, authUser:user, storageKey:authStorageKey });
  await page.route(supabaseUrl+'/**', async route => handleSupabase(route));
}

async function handleSupabase(route: Route) {
  const request = route.request();
  const url = new URL(request.url());
  if(url.pathname==='/auth/v1/token')return route.fulfill({json:{access_token:accessToken,refresh_token:'fixture-refresh',expires_in:3600,token_type:'bearer',user}});
  if(url.pathname==='/auth/v1/recover')return route.fulfill({json:{}});
  if (url.pathname === '/auth/v1/user') return route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify(user) });
  if (url.pathname === '/auth/v1/logout') return route.fulfill({ status:204 });
  if (url.pathname === '/rest/v1/rpc/delete_own_account') return route.fulfill({ status:204, contentType:'application/json', body:'' });
  const resource=url.pathname.split('/').at(-1)??'';
  if(resource==='import_transactions')return route.fulfill({json:request.postDataJSON().p_rows.length});
  if(resource==='record_recurring_occurrence')return route.fulfill({json:'recorded-occurrence'});
  if(resource==='transaction_page'){
    const {p_filters:f,p_page:p}=request.postDataJSON();
    const filtered=rows.transactions.filter(item=>{const t=item as Record<string,string|null>;const date=t.financial_date??new Date(new Date(String(t.transaction_date)).getTime()+8*3600000).toISOString().slice(0,10);return (!f.type||t.type===f.type)&&(!f.category||(f.category==='uncategorized'?t.category_id===null:t.category_id===f.category))&&(!f.from||date>=f.from)&&(!f.to||date<=f.to)&&(!f.activity||((t.activity_kind??'ordinary')===f.activity&&new Date(String(t.transaction_date))<=new Date()))&&(!f.search||String(t.description).toLowerCase().includes(f.search.toLowerCase()));});
    return route.fulfill({json:{rows:filtered.slice((p-1)*15,p*15),total:filtered.length}});
  }
  if(resource==='finance_list_usage'){const counts=new Map<string,{user_id:string;resource:string;id:unknown;transaction_count:number}>();for(const tx of rows.transactions as Record<string,unknown>[])for(const [resource,key] of [['categories','category_id'],['payments','payment_method_id']]){if(!tx[key])continue;const entry=counts.get(resource+tx[key])??{user_id:userId,resource,id:tx[key],transaction_count:0};entry.transaction_count++;counts.set(resource+tx[key],entry);}return route.fulfill({json:[...counts.values()]});}
  if(resource==='finance_daily_totals'){
    const bounds=url.searchParams.getAll('financial_date');
    const aggregated=new Map();
    for(const item of rows.transactions){const tx=item as Record<string,unknown>;if((tx.activity_kind??'ordinary')!=='ordinary'||new Date(String(tx.transaction_date))>new Date())continue;const date=String(tx.financial_date??new Date(new Date(String(tx.transaction_date)).getTime()+8*3600000).toISOString().slice(0,10));if(bounds.some(b=>b.startsWith('gte.')&&date<b.slice(4)||b.startsWith('lte.')&&date>b.slice(4)))continue;const key=JSON.stringify([date,tx.currency,tx.type,tx.category_id]);const current=aggregated.get(key)??{user_id:userId,month:date.slice(0,7),financial_date:date,currency:tx.currency,type:tx.type,category_id:tx.category_id,minor:0n,transaction_count:0};current.minor+=BigInt(String(tx.amount).replace('.',''));current.transaction_count++;aggregated.set(key,current);}
    const values=[...aggregated.values()].map(({minor,...row})=>({...row,amount:row.currency==='JPY'?String(minor):String(minor/100n)+'.'+String(minor%100n).padStart(2,'0')}));
    const offset=Number(url.searchParams.get('offset')??0),limit=Number(url.searchParams.get('limit')??1000);return route.fulfill({json:values.slice(offset,offset+limit)});
  }
  if(resource==='finance_monthly_totals')return route.fulfill({json:[{user_id:userId,month:'2026-09',currency:'MYR',type:'expense',category_id:null,amount:'25.00',transaction_count:1}]});
  if(resource==='finance_net_flow') {
    const sums=new Map<string,bigint>();
    for(const tx of rows.transactions as Record<string,unknown>[]) {
      if((tx.activity_kind??'ordinary')!=='ordinary'||new Date(String(tx.transaction_date))>new Date())continue;
      const currency=String(tx.currency), digits=currency==='JPY'?0:2;
      const [whole,fraction='']=String(tx.amount).split('.');
      const minor=BigInt(whole)*10n**BigInt(digits)+BigInt(fraction.padEnd(digits,'0')||'0');
      sums.set(currency,(sums.get(currency)??0n)+(tx.type==='income'?minor:-minor));
    }
    return route.fulfill({json:[...sums].map(([currency,value])=> {
      const negative=value<0n, absolute=negative?-value:value;
      return {user_id:userId,currency,amount:(negative?'-':'')+(currency==='JPY'?String(absolute):String(absolute/100n)+'.'+String(absolute%100n).padStart(2,'0'))};
    })});
  }
  const table=resource.replace(/^exact_/,'');
  if (!(table in rows)) return route.fulfill({ status:200, contentType:'application/json', body:'[]' });
  const singular = request.headers().accept?.includes('application/vnd.pgrst.object+json');
  if(resource==='exact_accounts'){for(const account of rows.accounts as {id:string;opening_balance:string;balance?:string}[]){const minor=(value:unknown)=>BigInt(String(value).replace('.',''));let total=minor(account.opening_balance);for(const tx of rows.transactions as {account_id:string;type:string;amount:string}[])if(tx.account_id===account.id)total+=(tx.type==='income'?1n:-1n)*minor(tx.amount);for(const transfer of rows.transfers as {source_account_id:string;destination_account_id:string;source_amount:string;destination_amount:string}[]){if(transfer.source_account_id===account.id)total-=minor(transfer.source_amount);if(transfer.destination_account_id===account.id)total+=minor(transfer.destination_amount);}account.balance=`${total/100n}.${String(total%100n).padStart(2,'0')}`;}}
  if (request.method() === 'GET') return route.fulfill({ status:200, contentType:'application/json', headers:{'content-range':`0-${Math.max(0,rows[table].length-1)}/${rows[table].length}`}, body:JSON.stringify(singular ? rows[table].find(row=>!url.searchParams.get('id')||(row as {id:string}).id===url.searchParams.get('id')?.replace('eq.',''))??null : rows[table]) });
  const body = request.postDataJSON?.() as Record<string, unknown> | undefined;
  if (request.method() === 'PATCH') {
    const selected=rows[table].findIndex(row=>(row as {id:string}).id===url.searchParams.get('id')?.replace('eq.',''));
    const index=selected<0?0:selected;const current=rows[table][index] as Record<string,unknown>;
    rows[table][index]={...current,...body};
    return route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify(singular ? rows[table][index] : [rows[table][index]]) });
  }
  if (request.method() === 'DELETE') { if(table==='categories'||table==='payment_methods'){const key=table==='categories'?'category_id':'payment_method_id',id=url.searchParams.get('id')?.replace('eq.','');for(const tx of rows.transactions as Record<string,unknown>[])if(tx[key]===id)tx[key]=null;} const index=rows[table].findIndex(row=>(row as {id:string}).id===url.searchParams.get('id')?.replace('eq.',''));const deleted={id:(rows[table].splice(Math.max(0,index),1)[0] as {id:string}).id}; return route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify(singular?deleted:[deleted]) }); }
  const created={id:crypto.randomUUID(),user_id:userId,created_at:new Date().toISOString(),updated_at:new Date().toISOString(),...body};rows[table].push(created);return route.fulfill({status:201,json:singular?created:[created]});
}
