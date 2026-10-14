// Ordinary synthetic users against the explicitly isolated, protected hosted preview.
// Credentials, downloaded CSVs and browser storage never enter the receipt.
import assert from 'node:assert/strict';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash, randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {chromium, expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const bounded=async(operation,milliseconds,label)=>{let timer;try{return await Promise.race([operation,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(label+' exceeded the bounded test deadline')),milliseconds);})]);}finally{clearTimeout(timer);}};
const step=label=>console.log('START hosted workspace:',label);

const ORIGIN='https://prism-staging-acceptance-ismailstudio.vercel.app';
const API='https://zwqcdfzfsudqccclficx.supabase.co';
const load=async name=>{try{return JSON.parse(await readFile(`.cache/${name}.json`,'utf8'));}catch{throw new Error('Missing or invalid private test input: '+name);}};
const config=await load('prism-staging-client'), manifest=await load('prism-staging-preview-manifest');
const access=await load('prism-staging-vercel-access');
assert.equal(new URL(access.url).origin,ORIGIN);assert.ok(new URL(access.url).searchParams.has('_vercel_share'));
const actorA=await load('prism-staging-actor-a'), actorB=await load('prism-staging-actor-b');
assert.equal(config.url,API);assert.equal(config.projectRef,'zwqcdfzfsudqccclficx');
assert.equal(manifest.origin,ORIGIN);assert.equal(manifest.vercelProjectId,'prj_nrfjV3bBN8WnVcGINUUZlLL4HuYe');
assert.equal(manifest.stagingRef,config.projectRef);assert.match(manifest.candidateSHA,/^[a-f0-9]{40}$/);
assert.ok(config.anonKey.startsWith('sb_publishable_'));
const runId=randomUUID().slice(0,8), tag=`PRISM UI ${runId}`, temporary={accounts:[],transactions:[],transfers:[]};
const finishOnly=process.argv.includes('--finish');
const receipt={startedAt:new Date().toISOString(),environment:'STAGING-HOSTED',...manifest,
  checkoutSHA:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),partialRun:finishOnly,
  harnessSHA256:createHash('sha256').update(await readFile(new URL(import.meta.url))).digest('hex'),
  syntheticOnly:true,fixtureEndpoints:false,serviceRoleUsed:false,productionContacted:false,
  credentialsOrStoragePublished:false,checks:[],axe:[],runtimeErrors:0,foreignBackendRequests:0,
  limits:['Viewport and network interruption are browser emulation, not physical-device or assistive-technology acceptance.',
    'Auth inbox/OAuth/CAPTCHA acceptance and production release are separate gates.'],latency:[]};
const guardFetch=async (input,init={})=>{const u=new URL(typeof input==='string'?input:input.url??input);
  assert.equal(u.origin,API);assert.ok(u.pathname.startsWith('/auth/v1/')||u.pathname.startsWith('/rest/v1/'));
  return fetch(input,{...init,redirect:'error',signal:AbortSignal.timeout(20000)});};
const db=createClient(API,config.anonKey,{global:{fetch:guardFetch},auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
const ok=(r,label)=>{assert.equal(r.error,null,label);return r.data;};
step('restore ordinary B session');
const restored=ok(await bounded(db.auth.setSession({access_token:actorB.session.access_token,refresh_token:actorB.session.refresh_token}),30000,'Ordinary B session restoration'),'ordinary B session');
assert.equal(restored.user.id,actorB.userId);const claims=JSON.parse(Buffer.from(restored.session.access_token.split('.')[1],'base64url').toString());
assert.equal(claims.iss,API+'/auth/v1');assert.equal(claims.role,'authenticated');assert.equal(claims.sub,actorB.userId);
const originalProfile=ok(await db.from('profiles').select('language,theme,financial_timezone').eq('id',actorB.userId).single(),'B profile');
const privateValues=[];const collect=v=>{if(typeof v==='string'&&v.length>=8)privateValues.push(v);else if(v&&typeof v==='object')Object.values(v).forEach(collect);};
collect(config);collect(access);collect(actorA);collect(actorB);
const redact=message=>{let text=String(message);for(const value of privateValues.sort((a,b)=>b.length-a.length))text=text.split(value).join('[private value]');return text.replace(/\u001b\[[0-9;]*m/g,'').replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g,'[private address]').replace(/https?:\/\/\S+/g,'[url]').replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g,'[token]');};
let browser, context, page, active='ordinary hosted UI signin',closing=false,offline=false;
receipt.transportErrors=0;receipt.providerAccess='Permitted temporary Vercel share-link session; development OIDC trust remains withdrawn';
const allowedOrigins=new Set([ORIGIN,API,'https://challenges.cloudflare.com']);
const guardedRoute=async route=>{
  let response;
  try{
    const u=new URL(route.request().url());
    if(!allowedOrigins.has(u.origin)||u.username||u.password){receipt.foreignBackendRequests++;await route.abort();return;}
    if(offline){await route.abort('internetdisconnected');return;}
    const headers={...route.request().headers()};for(const name of Object.keys(headers))if(/^x-vercel-(?:trusted-oidc-idp-token|protection-bypass)$/i.test(name))delete headers[name];
    response=await route.fetch({headers,maxRedirects:0,timeout:20000});
    const location=response.headers().location;
    if(location){const next=new URL(location,u);if(!allowedOrigins.has(next.origin)||next.username||next.password){receipt.foreignBackendRequests++;await route.abort('blockedbyclient');return;}}
    await route.fulfill({response}); // Unchanged, real authorized provider response.
  }catch{
    if(!closing&&!offline)receipt.transportErrors++;
    try{await route.abort();}catch{} // Closing contexts must never throw header-bearing transport diagnostics.
  }
  finally{if(response)try{await response.dispose();}catch{if(!closing)receipt.transportErrors++;}}
};
const closeContext=async()=>{if(!context)return;closing=true;let failed=false;try{await bounded(context.unrouteAll({behavior:'wait'}),30000,'Guarded route drain');}catch{failed=true;}try{await bounded(context.close(),30000,'Browser context close');}catch{failed=true;}context=undefined;closing=false;if(failed)throw new Error('Guarded browser cleanup failed; private details withheld');};
const visit=url=>page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
const enterProtectedPreview=async()=>{await visit(access.url);await expect(page).toHaveURL(u=>u.origin===ORIGIN&&!u.searchParams.has('_vercel_share'),{timeout:30000});};
const pass=(label,details={})=>{receipt.checks.push({label,status:'PASS',...details});console.log('PASS hosted workspace:',label);};
const signin=async (actor)=>{await visit(ORIGIN+'/login');await page.getByLabel(/^(Email address|Alamat e-mel)$/).fill(actor.email);
  await page.locator('#auth-password').fill(actor.password);await page.locator('form').getByRole('button',{name:/^(Sign in|Log masuk)$/,exact:true}).click();
  await expect(page).toHaveURL(/\/dashboard$/,{timeout:30000});};
const audit=async label=>{const result=await bounded(new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze(),60000,'Accessibility scan '+label);
  const violations=result.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.length}));receipt.axe.push({label,violations});assert.equal(violations.length,0,label);};
const checkReflow=async()=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
const accountIds={};
try{
  step('prepare synthetic B preferences and browser');
  ok(await db.from('profiles').update({language:'en',theme:'light'}).eq('id',actorB.userId),'set synthetic B test preferences');
  browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'msedge'}:{})});
  context=await browser.newContext({viewport:{width:390,height:844},colorScheme:'light'});
  await context.route('**/*',guardedRoute);
  page=await context.newPage();page.on('pageerror',()=>receipt.runtimeErrors++);
  page.on('requestfinished',r=>{if(r.url().startsWith(API+'/rest/v1/')){const t=r.timing();if(t.responseEnd>0)receipt.latency.push(t.responseEnd);}});
  await enterProtectedPreview();
  step('protected staging entry accepted');
  if(!finishOnly){
  await signin(actorB);pass('ordinary B UI signin without fixture responses');
  for(const [currency,amount,invalid,balance] of [['MYR','0.01','0.001','10.01'],['USD','0.01','0.001','10.01'],['EUR','0.01','0.001','10.01'],['JPY','1','0.1','11']]){
    active=`${currency} exact account and transaction`;await visit(ORIGIN+'/accounts');
    await page.getByRole('button',{name:'Add account',exact:true}).click();let dialog=page.getByRole('dialog');
    await dialog.getByLabel('Account name',{exact:true}).fill(`${tag} ${currency}`);await dialog.getByRole('combobox',{name:'Currency',exact:true}).selectOption(currency);
    await dialog.getByLabel('Opening balance',{exact:true}).fill('10');active=currency+' account save';await dialog.getByRole('button',{name:'Save account',exact:true}).click();await expect(dialog).toHaveCount(0,{timeout:30000});
    const account=ok(await db.from('accounts').select('id,name,currency,opening_balance').eq('user_id',actorB.userId).eq('name',`${tag} ${currency}`).single(),'own UI-created account');
    accountIds[currency]=account.id;temporary.accounts.push(account.id);
    await visit(ORIGIN+'/transactions');await page.getByRole('button',{name:'Add transaction',exact:true}).click();dialog=page.getByRole('dialog');
    await dialog.getByRole('button',{name:'Income',exact:true}).click();await dialog.getByRole('combobox',{name:'Currency',exact:true}).selectOption(currency);
    await dialog.getByLabel('Amount',{exact:true}).fill(invalid);await dialog.getByLabel('Description',{exact:true}).fill(`${tag} ${currency} exact`);
    await dialog.getByRole('combobox',{name:'Account (optional)',exact:true}).selectOption(account.id);await dialog.getByLabel('Date',{exact:true}).fill('2026-10-14T12:00');
    let posts=0;const observer=req=>{if(req.url().startsWith(API+'/rest/v1/transactions')&&req.method()==='POST')posts++;};page.on('request',observer);
    active=currency+' precision denial';await dialog.getByRole('button',{name:'Add transaction',exact:true}).click();await expect(dialog.getByRole('alert')).toContainText(currency+' allows');assert.equal(posts,0);
    await audit(currency+' precision form');await checkReflow();
    active=currency+' exact transaction save';await dialog.getByLabel('Amount',{exact:true}).fill(amount);await dialog.getByRole('button',{name:'Add transaction',exact:true}).click();await expect(dialog).toHaveCount(0,{timeout:30000});page.off('request',observer);assert.equal(posts,1);
    const rows=ok(await db.from('exact_transactions').select('id,amount,currency').eq('user_id',actorB.userId).eq('description',`${tag} ${currency} exact`),'own persisted transaction');
    assert.equal(rows.length,1);assert.equal(rows[0].amount,amount);temporary.transactions.push(rows[0].id);
    const position=ok(await db.from('exact_accounts').select('balance').eq('id',account.id).single(),'own exact account balance');assert.equal(position.balance,balance);
    pass(active,{invalidPrecisionDenied:true,writes:posts,exactDecimalText:amount,exactBalance:balance});
  }
  active='cross-currency explicit transfer';await visit(ORIGIN+'/accounts');await page.getByRole('button',{name:'New transfer',exact:true}).click();
  let dialog=page.getByRole('dialog');await dialog.getByRole('combobox',{name:'Source account',exact:true}).selectOption(accountIds.MYR);await dialog.getByRole('combobox',{name:'Destination account',exact:true}).selectOption(accountIds.USD);
  await dialog.getByLabel('Source amount (MYR)',{exact:true}).fill('2.00');await dialog.getByLabel('Destination amount (USD)',{exact:true}).fill('1.00');
  await dialog.getByLabel('Note',{exact:true}).fill(tag+' transfer');await dialog.getByRole('button',{name:'Save transfer',exact:true}).click();await expect(dialog).toHaveCount(0);
  const transfers=ok(await db.from('transfers').select('id,source_amount,destination_amount').eq('user_id',actorB.userId).eq('note',tag+' transfer'),'owned transfer');
  assert.equal(transfers.length,1);temporary.transfers.push(transfers[0].id);assert.equal(transfers[0].source_amount,2);assert.equal(transfers[0].destination_amount,1);
  const transferred=ok(await db.from('exact_accounts').select('id,balance').in('id',[accountIds.MYR,accountIds.USD]),'native transferred balances');
  assert.equal(transferred.find(v=>v.id===accountIds.MYR).balance,'8.01');assert.equal(transferred.find(v=>v.id===accountIds.USD).balance,'11.01');pass(active,{nativeMYR:'8.01',nativeUSD:'11.01',fxPresentationUsedForPosting:false});
  active='CSV invalid precision, actual atomic import, duplicate denial and protected formula export';await visit(ORIGIN+'/transactions');
  await page.getByRole('button',{name:'Import CSV',exact:true}).click();dialog=page.getByRole('dialog');
  await dialog.getByLabel('CSV file',{exact:true}).setInputFiles({name:'invalid.csv',mimeType:'text/csv',buffer:Buffer.from('Date,Amount,Description\n2026-10-14,0.001,'+tag+' invalid')});
  await dialog.getByRole('button',{name:'Preview and validate',exact:true}).click();await expect(dialog.getByRole('alert')).toContainText('MYR allows 2 decimal places');await expect(dialog.getByRole('button',{name:'Import validated rows',exact:true})).toBeDisabled();
  const formula='=1+1 '+tag, csv='Date,Amount,Description\n2026-10-14,0.07,'+formula;
  await dialog.getByLabel('CSV file',{exact:true}).setInputFiles({name:'synthetic.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});
  await dialog.getByRole('combobox',{name:'Default type',exact:true}).selectOption('income');await dialog.getByRole('combobox',{name:'Account',exact:true}).selectOption(accountIds.MYR);
  await dialog.getByRole('button',{name:'Preview and validate',exact:true}).click();await expect(dialog).toContainText('1 valid rows · 0 errors');
  await dialog.getByRole('button',{name:'Import validated rows',exact:true}).click();await expect(dialog).toHaveCount(0);
  const imported=ok(await db.from('exact_transactions').select('id,amount').eq('user_id',actorB.userId).eq('description',formula),'owned exact imported row');assert.equal(imported.length,1);assert.equal(imported[0].amount,'0.07');temporary.transactions.push(imported[0].id);
  await page.getByRole('button',{name:'Import CSV',exact:true}).click();dialog=page.getByRole('dialog');
  await dialog.getByLabel('CSV file',{exact:true}).setInputFiles({name:'synthetic.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});await dialog.getByRole('combobox',{name:'Default type',exact:true}).selectOption('income');await dialog.getByRole('combobox',{name:'Account',exact:true}).selectOption(accountIds.MYR);
  await dialog.getByRole('button',{name:'Preview and validate',exact:true}).click();await dialog.getByRole('button',{name:'Import validated rows',exact:true}).click();await expect(dialog).toHaveCount(0);
  assert.equal(ok(await db.from('transactions').select('id').eq('user_id',actorB.userId).eq('description',formula),'UI duplicate row count').length,1);
  await page.getByRole('textbox',{name:'Search transactions…',exact:true}).fill(tag);await expect(page.locator('.transaction-workspace').getByRole('button',{name:'Export this page',exact:true})).toBeEnabled();
  await expect(page.locator('.transaction-workspace')).toContainText(formula);
  const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Export this page',exact:true}).click();const download=await downloadPromise;
  const downloaded=await readFile(await download.path(),'utf8');assert.ok(downloaded.includes('"\''+formula+'"'));assert.ok(downloaded.includes('"0.07"'));assert.ok(!downloaded.includes(actorA.email)&&!downloaded.includes(actorB.email));
  pass(active,{exactImportedAmount:'0.07',retainedMatchingRows:1,spreadsheetFormulaPrefixed:true,csvContentsPublished:false});
  active='network-denied financial save and fresh recovery';await page.getByRole('button',{name:'Add transaction',exact:true}).click();dialog=page.getByRole('dialog');
  await dialog.getByLabel('Amount',{exact:true}).fill('0.09');await dialog.getByLabel('Description',{exact:true}).fill(tag+' denied save');
  const failedRoute=async route=>route.request().method()==='POST'?route.abort('internetdisconnected'):route.fallback();
  await page.route(API+'/rest/v1/transactions*',failedRoute);await dialog.getByRole('button',{name:'Add transaction',exact:true}).click();await expect(dialog.getByRole('alert')).toBeVisible({timeout:30000});
  await expect(dialog).toBeVisible();assert.equal(ok(await db.from('transactions').select('id').eq('user_id',actorB.userId).eq('description',tag+' denied save'),'failed save not posted').length,0);
  await page.unroute(API+'/rest/v1/transactions*',failedRoute);await page.keyboard.press('Escape');await page.reload();
  assert.equal(ok(await db.from('transactions').select('id').eq('user_id',actorB.userId).eq('description',tag+' denied save'),'no queued replay').length,0);pass(active,{interruption:'real request aborted by browser test',automaticReplay:false});
  const destinations=['dashboard','transactions','analytics','accounting','accounts','plans','goals','savings','debts','categories','payments','settings','notes','reminders','notifications','calendar'];
  for(const [locale,theme] of [['en','light'],['ms','dark'],['en','dark'],['ms','light']]){
    active=`saved preferences ${locale}/${theme}`;await visit(ORIGIN+'/settings');const profileForm=page.locator('form.settings-form');
    await profileForm.getByRole('combobox',{name:/^(Language|Bahasa)$/,exact:true}).selectOption(locale);await profileForm.getByRole('button',{name:theme==='dark'?/^(Dark|Gelap)$/:/^(Light|Cerah)$/,exact:true}).click();
    await profileForm.getByRole('button',{name:/^(Changes saved|Save changes|Save|Simpan perubahan|Simpan)$/,exact:true}).click();
    await expect(page.locator('html')).toHaveAttribute('lang',locale);await expect.poll(()=>page.locator('html').evaluate(e=>e.classList.contains('dark'))).toBe(theme==='dark');
    const stored=ok(await db.from('profiles').select('language,theme').eq('id',actorB.userId).single(),'saved hosted preferences');assert.equal(stored.language,locale);assert.equal(stored.theme,theme);
    for(const tab of destinations){active=`${locale}/${theme} /${tab}`;await visit(ORIGIN+'/'+tab);await expect(page.locator('main h1')).toHaveCount(1);await expect(page.locator('main h1')).toBeVisible();assert.equal(new URL(page.url()).pathname,'/'+tab);
      await expect(page.locator('main [role="status"]').filter({hasText:/Loading|Memuatkan/})).toHaveCount(0,{timeout:30000});
      for(const width of [390,1440]){await page.setViewportSize({width,height:900});await checkReflow();}await audit(active);pass(active,{widths:[390,1440]});
    }
  }
  }
  // Restore the actor's original preferences before independent oracle UI checks.
  ok(await db.from('profiles').update(originalProfile).eq('id',actorB.userId),'restore synthetic B profile');
  step('close B context and prepare ordinary A oracle');
  await closeContext();context=await browser.newContext({viewport:{width:390,height:844},colorScheme:'light'});
  await context.route('**/*',guardedRoute);
  page=await context.newPage();page.on('pageerror',()=>receipt.runtimeErrors++);await enterProtectedPreview();step('ordinary A signin');await signin(actorA);active='A independent cash-flow, goal and principal oracle';
  await expect(page.locator('.snapshot-value')).toContainText('2,140.00');await expect(page.locator('.snapshot-metric.income')).toContainText('5,200.00');await expect(page.locator('.snapshot-metric.expense')).toContainText('3,060.00');
  await expect(page.locator('.position-section').filter({hasText:'Your accounts'})).toContainText('2,840.00');await expect(page.locator('.position-section').filter({hasText:'Your accounts'})).toContainText('2,200.00');await expect(page.locator('.position-section').filter({hasText:'Your commitments'})).toContainText('900.00');pass(active);
  active='mobile drawer, quick-add focus and privacy';const bottom=page.getByRole('navigation',{name:'Primary navigation',exact:true});await bottom.getByRole('button',{name:'More',exact:true}).click();await expect(page.getByRole('dialog',{name:'WORKSPACE',exact:true})).toBeVisible();await page.keyboard.press('Escape');await expect(bottom.getByRole('button',{name:'More',exact:true})).toBeFocused();
  await bottom.getByRole('button',{name:'Quick Add',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');await expect(bottom.getByRole('button',{name:'Quick Add',exact:true})).toBeFocused();
  await visit(ORIGIN+'/goals');await expect(page.locator('main [role="status"]').filter({hasText:/Loading|Memuatkan/})).toHaveCount(0,{timeout:30000});const goal=page.locator('button.selection-card').filter({hasText:'PRISM hosted 20261014 Emergency fund'});await expect(goal).toHaveCount(1,{timeout:30000});await expect(goal).toContainText('60%');await page.getByRole('button',{name:'Privacy Mode',exact:true}).click();await expect(goal).not.toContainText('60%');
  for(const bar of await page.getByRole('progressbar').all())await expect(bar).not.toHaveAttribute('aria-valuenow');await audit(active);await page.getByRole('button',{name:'Privacy Mode',exact:true}).click();await expect(goal).toContainText('60%');pass(active);
  active='hosted PWA public cache and network-only private screen';await page.evaluate(()=>Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>setTimeout(()=>reject(new Error('Real hosted worker installation timed out')),30000))]));await expect.poll(()=>page.evaluate(()=>Boolean(navigator.serviceWorker.controller)),{timeout:30000}).toBe(true);
  const inventory=await page.evaluate(async()=>{const all=[];for(const name of await caches.keys()){const cache=await caches.open(name);all.push({name,paths:(await cache.keys()).map(r=>new URL(r.url).pathname)});}return all;});
  assert.equal(inventory.length,1);assert.ok(inventory[0].paths.every(p=>p.startsWith('/assets/')||p.startsWith('/offline-')));assert.deepEqual(await page.evaluate(()=>indexedDB.databases()),[]);
  offline=true;await context.setOffline(true);await expect(page.getByRole('heading',{name:'You are offline',exact:true})).toBeVisible();await expect(page.getByText('PRISM hosted 20261014 Emergency fund',{exact:true})).toHaveCount(0);
  await visit(ORIGIN+'/accounts');await expect(page.getByRole('heading',{name:'You are offline',exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'Anda di luar talian',exact:true})).toBeVisible();
  const restarted=await context.newPage();await restarted.goto(ORIGIN+'/transactions');await expect(restarted.getByRole('heading',{name:'You are offline',exact:true})).toBeVisible();await restarted.close();
  offline=false;await context.setOffline(false);await page.getByRole('link',{name:'Try again / Cuba lagi',exact:true}).click();await visit(ORIGIN+'/accounts');await expect(page.locator('main [role="status"]').filter({hasText:/Loading|Memuatkan/})).toHaveCount(0,{timeout:30000});await expect(page.getByRole('heading',{name:'PRISM hosted 20261014 Everyday account',exact:true})).toBeVisible({timeout:30000});pass(active,{cache:inventory,restart:true,privateDataCached:false});
  active='real mobile signout, back and private deep-link denial';await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('dialog',{name:'WORKSPACE',exact:true}).getByRole('button',{name:'Sign out',exact:true}).click();await expect(page).toHaveURL(/\/login/);await page.goBack();await expect(page.getByText('PRISM hosted 20261014 Everyday account',{exact:true})).toHaveCount(0);
  await visit(ORIGIN+'/accounts');await expect(page).toHaveURL(/\/login\?next=%2Faccounts/);assert.equal(await page.evaluate(()=>localStorage.getItem('sb-zwqcdfzfsudqccclficx-auth-token')),null);pass(active);
  assert.equal(receipt.runtimeErrors,0);assert.equal(receipt.foreignBackendRequests,0);assert.equal(receipt.transportErrors,0);receipt.status='PASS';
}catch(error){const alerts=await page?.getByRole('alert').allTextContents().catch(()=>[]);const surface=await page?.locator('main').innerText().catch(()=>'(surface unavailable)');receipt.status='FAIL';receipt.failure={step:active,message:redact(String(error.message)+'\nVisible alerts: '+(alerts??[]).join(' | ')).slice(0,1000),syntheticSurface:redact(surface??'').slice(0,1200)};console.error('FAIL hosted workspace:',active);process.exitCode=1;}
finally{
  try{await closeContext();}catch{receipt.status='FAIL';receipt.teardownFailure='Guarded browser context cleanup failed; private diagnostics withheld';process.exitCode=1;}
  try{await bounded(browser?.close(),30000,'Browser close');}catch{receipt.status='FAIL';receipt.teardownFailure='Browser cleanup failed; private diagnostics withheld';process.exitCode=1;}
  try{
    ok(await db.from('profiles').update(originalProfile).eq('id',actorB.userId),'restore original synthetic profile');
    // Discover only this run's exact namespace when a UI action failed before ID capture.
    for(const [table,column] of [['transactions','description'],['transfers','note'],['accounts','name']]){
      const own=ok(await db.from(table).select('id').eq('user_id',actorB.userId).like(column,`%${tag}%`),'discover only run-owned synthetic cleanup');
      const ids=[...new Set([...temporary[table],...own.map(r=>r.id)])];if(ids.length)ok(await db.from(table).delete().eq('user_id',actorB.userId).in('id',ids),'clean exact owned synthetic IDs');
      assert.equal(ok(await db.from(table).select('id').eq('user_id',actorB.userId).like(column,`%${tag}%`),'cleanup recheck').length,0);
    }
    receipt.temporaryFixturesCleaned=true;
  }catch{receipt.temporaryFixturesCleaned=false;receipt.status='FAIL';receipt.cleanupFailure='Ordinary owning-session cleanup failed; exact synthetic namespace retained privately for repair';await writeFile('.cache/prism-staging-ui-cleanup.json',JSON.stringify({tag,temporary}));process.exitCode=1;}
  receipt.finishedAt=new Date().toISOString();await mkdir('artifacts/public-launch',{recursive:true});
  const {latency,...published}=receipt;const samples=latency.filter(n=>n>0&&n<120000).sort((a,b)=>a-b);published.observedResponses=samples.length;
  if(samples.length)published.transportLatencyMillis={median:samples[Math.floor(samples.length/2)],p95:samples[Math.floor((samples.length-1)*.95)]};
  await writeFile('artifacts/public-launch/hosted-workspace-browser-acceptance.json',JSON.stringify(published,null,2));
  await writeFile(`artifacts/public-launch/hosted-workspace-${runId}.json`,JSON.stringify(published,null,2));
  console.log(JSON.stringify({status:receipt.status,checks:receipt.checks.length,axeScans:receipt.axe.length,cleanup:receipt.temporaryFixturesCleaned,failure:receipt.failure??null}));
}
