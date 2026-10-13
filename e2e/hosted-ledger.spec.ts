import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockSignedInApp, rows, userId, supabaseUrl } from './fixtures';

type RecordRow = Record<string, unknown>;
function ledgerRows(amount = '90071992547409.93', currency = 'MYR') {
  const owned = { user_id:userId, currency }, date = '2026-10-13';
  return {
    ledger_accounts:[{...owned,id:'cash',code:'cash',classification:'asset'},{...owned,id:'equity',code:'opening_equity',classification:'equity'}],
    financial_events:[{...owned,id:'event',kind:'opening',financial_date:date,financial_timezone:'Asia/Kuala_Lumpur',request_key:'owned-opening'}],
    exact_ledger_lines:[{...owned,id:'line1',journal_id:'journal',event_id:'event',account_id:'cash',classification:'asset',side:'debit',amount,ordinal:1,financial_date:date},{...owned,id:'line2',journal_id:'journal',event_id:'event',account_id:'equity',classification:'equity',side:'credit',amount,ordinal:2,financial_date:date}],
    exact_ledger_allocations:[],
  } as Record<string, RecordRow[]>;
}
async function serve(page:Page, records:Record<string,RecordRow[]>, corrupt?:'count'|'numeric'|'foreign'|'balance'|'failure'|'missing-count') {
  const requests:string[]=[];
  for(const table of Object.keys(records)) await page.route(supabaseUrl+'/rest/v1/'+table+'*', async route => {
    const request=route.request(), url=new URL(request.url()); requests.push(request.method()+':'+table);
    expect(url.searchParams.get('user_id')).toBe('eq.'+userId);
    if(corrupt==='failure') return route.fulfill({status:503,json:{message:'Private backend details must not be exposed'}});
    const data=structuredClone(records[table]);
    if(table==='exact_ledger_lines' && data.length && corrupt==='numeric') data[0].amount=1.23;
    if(data.length && corrupt==='foreign') data[0].user_id='another-owner';
    if(table==='exact_ledger_lines' && data.length && corrupt==='balance') data[0].amount='1.23';
    const offset=Number(url.searchParams.get('offset')??0), limit=Number(url.searchParams.get('limit')??1000);
    const count=data.length+(corrupt==='count'&&request.method()==='HEAD'?1:0);
    const headers=corrupt==='missing-count'?{}:{'access-control-expose-headers':'content-range','content-range':`0-${Math.max(0,data.length-1)}/${count}`};
    return route.fulfill({status:200,contentType:'application/json',headers,body:request.method()==='HEAD'?'':JSON.stringify(data.slice(offset,offset+limit))});
  });
  return requests;
}
for(const locale of ['en','ms'] as const) test(`owned hosted-ledger transport is exact, accessible and read only in ${locale}`,async({page})=>{
  await mockSignedInApp(page); Object.assign(rows.profiles[0] as object,{language:locale});
  await page.clock.install({time:new Date('2026-10-13T04:00:00Z')});
  const before=structuredClone(rows), requests=await serve(page,ledgerRows());
  await page.setViewportSize({width:375,height:812}); await page.goto('/accounting');
  const sheet=page.getByRole('region',{name:locale==='en'?'Shadow balance sheet':'Kunci kira-kira bayangan',exact:true});
  // Auth initialization precedes the four private reads and count fences.
  // Wait for the complete report; keep every exact financial assertion.
  await expect(sheet).toContainText('90,071,992,547,409.93',{timeout:15000});
  await expect(page.getByRole('status').filter({hasText:locale==='en'?'Exact equation difference':'Perbezaan persamaan tepat'})).toContainText('0.00');
  await page.locator('summary').filter({hasText:'owned-opening'}).press('Enter');
  await expect(page.getByRole('region',{name:(locale==='en'?'Scroll journal':'Tatal jurnal')+' owned-opening',exact:true})).toContainText('90,071,992,547,409.93');
  expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.getByRole('button',{name:locale==='en'?'Privacy Mode':'Mod Privasi',exact:true}).click();
  await expect(sheet).not.toContainText('90,071,992,547,409.93'); await expect(sheet).toContainText('••••');
  expect(requests.every(r=>r.startsWith('GET:')||r.startsWith('HEAD:'))).toBe(true);
  expect(rows).toEqual(before);
});
for(const corrupt of ['count','numeric','foreign','balance','failure','missing-count'] as const) test(`incomplete or unsafe ledger ${corrupt} cannot produce a financial report`,async({page})=>{
  await mockSignedInApp(page); await serve(page,ledgerRows(),corrupt); await page.goto('/accounting');
  // The provider SDK retries idempotent 503 reads with bounded backoff. Keep
  // the financial assertion, allowing the actual failed read to settle.
  await expect(page.getByRole('alert')).toContainText('Unable to load this financial data',{timeout:25000});
  await expect(page.getByRole('region',{name:'Shadow balance sheet',exact:true})).toHaveCount(0);
  await expect(page.getByRole('alert')).not.toContainText('Private backend details');
});
test('empty hosted ledger does not imply zero assets or replace recorded accounts',async({page})=>{
  await mockSignedInApp(page); const empty=Object.fromEntries(Object.keys(ledgerRows()).map(key=>[key,[]])); await serve(page,empty); await page.goto('/accounting');
  // Four count-fence reads must finish before the empty-state conclusion.
  await expect(page.getByText('No posted shadow entries in this currency.',{exact:false})).toBeVisible({timeout:15000});
  await expect(page.getByRole('region',{name:'Shadow balance sheet',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Synthetic example',exact:true}).click();
  await expect(page.getByText('Synthetic fixtures only.',{exact:false})).toBeVisible();
});
test('more than one server page is read completely, including integer JPY',async({page})=>{
  await mockSignedInApp(page); await page.clock.install({time:new Date('2026-10-13T04:00:00Z')});
  const records=ledgerRows('123','JPY');
  records.ledger_accounts.push(...Array.from({length:1000},(_,i)=>({id:'unused-'+i,user_id:userId,code:'unused_'+i,currency:'JPY',classification:'asset'})));
  const requests=await serve(page,records); await page.goto('/accounting');
  await page.getByRole('combobox',{name:'Native currency',exact:true}).selectOption('JPY');
  await expect(page.getByRole('region',{name:'Shadow balance sheet',exact:true})).toContainText('123');
  expect(requests.filter(r=>r==='GET:ledger_accounts').length).toBe(2);
});
