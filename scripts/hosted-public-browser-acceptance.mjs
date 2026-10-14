// Actual protected staging assets, public UI and anonymous private-route guards.
// Inputs stay in ignored local files. No provider responses or credentials are logged.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {chromium,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const origin='https://prism-staging-acceptance-ismailstudio.vercel.app';
const stagingRef='zwqcdfzfsudqccclficx';
const runId=randomUUID().slice(0,8);
const bounded=async(operation,milliseconds,label)=>{let timer;try{return await Promise.race([operation,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(label+' exceeded the bounded test deadline')),milliseconds);})]);}finally{clearTimeout(timer);}};
const privateInputs=new Set();
const remember=value=>{if(typeof value==='string'&&value.length)privateInputs.add(value);};
const redact=value=>{
 let result=String(value);
 for(const input of [...privateInputs].sort((a,b)=>b.length-a.length))result=result.split(input).join('[private value]');
 return result.replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g,'[private address]').replace(/https?:\/\/\S+/g,'[url]').replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g,'[token]').replace(/\bsb_(?:secret|publishable)_[\w-]+\b/g,'[key]').slice(0,700);
};
const load=async name=>{const raw=await readFile('.cache/'+name+'.json','utf8');try{return JSON.parse(raw);}catch{throw new Error('Invalid private input file '+name+'; values withheld');}};
const receipt={startedAt:new Date().toISOString(),environment:'STAGING-HOSTED',origin,stagingRef,checkoutSHA:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),harnessSHA256:createHash('sha256').update(await readFile(new URL(import.meta.url))).digest('hex'),syntheticOnly:true,productionContacted:false,serviceRoleUsed:false,credentialsOrStorageStatePublished:false,protectionAccess:'approved temporary share-link session',checks:[],axe:[],limits:['Browser viewport tests are emulation, not physical devices or assistive technology.','Public routes and anonymous private-route guards do not prove signed-in financial workflows.','Service workers are blocked in these public UI contexts; genuine hosted PWA acceptance is recorded separately.']};
const contexts=new Map();
let active='protected preview and asset isolation';
let browser;
const teardown=async context=>{
 const state=contexts.get(context);
 state.closing=true;
 try{await bounded(context.unrouteAll({behavior:'ignoreErrors'}),30000,'Intentional background route cancellation');}catch{state.errors.push('guarded-route-teardown-failed');}
 try{await bounded(context.close(),30000,'Browser context close');}catch{state.errors.push('browser-context-close-failed');}
 contexts.delete(context);
 return state;
};
try{
 const manifest=await load('prism-staging-preview-manifest');
 const access=await load('prism-staging-vercel-access');
 const client=await load('prism-staging-client');
 remember(access.url);remember(client.anonKey);
 let share;
 try{share=new URL(access.url);}catch{throw new Error('Approved staging share URL must be valid; values withheld');}
 for(const value of share.searchParams.values()){remember(value);remember(encodeURIComponent(value));}
 assert.ok(share.protocol==='https:'&&share.origin===origin&&share.pathname==='/'&&!share.username&&!share.password&&!share.hash&&share.searchParams.has('_vercel_share'),'Share access must match the actual provider-issued staging root URL; values withheld');
 assert.ok(manifest.origin===origin&&manifest.vercelProjectId==='prj_nrfjV3bBN8WnVcGINUUZlLL4HuYe','Preview identity must be exact isolated staging');
 assert.ok(manifest.stagingRef===stagingRef&&client.url==='https://'+stagingRef+'.supabase.co'&&client.projectRef===stagingRef,'API and client identity must be exact isolated staging');
 assert.ok(typeof client.anonKey==='string'&&!client.anonKey.startsWith('sb_secret_'),'Only an intended public API key may be inspected');
 const keyKind=client.anonKey.startsWith('sb_publishable_')?'publishable':'legacy-anon';
 if(keyKind==='publishable')assert.ok(/^sb_publishable_[A-Za-z0-9_-]{16,}$/.test(client.anonKey),'Publishable key format must be valid; private values withheld');
 else{
  let payload;
  try{assert.ok(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(client.anonKey));payload=JSON.parse(Buffer.from(client.anonKey.split('.')[1],'base64url').toString());}
  catch{throw new Error('Legacy public key payload must be valid; private values withheld');}
  assert.ok(payload.role==='anon'&&payload.ref===stagingRef,'Legacy public key must have anonymous role and the exact staging ref');
 }
 assert.ok(/^[a-f0-9]{40}$/.test(manifest.candidateSHA),'Candidate identity must be a complete commit SHA');
 Object.assign(receipt,{deploymentId:manifest.deploymentId,vercelProjectId:manifest.vercelProjectId,candidateSHA:manifest.candidateSHA});
 const allowedOrigins=new Set([origin,client.url,'https://challenges.cloudflare.com']);
 const abortSafely=async(route,state)=>{try{await route.abort();}catch{if(!state.closing)state.errors.push('guarded-route-abort-failed');}};
 const rememberCookies=async context=>{for(const cookie of await context.cookies()){remember(cookie.value);remember(encodeURIComponent(cookie.value));}};
 const protectedContext=async options=>{
  const context=await browser.newContext({...options,serviceWorkers:'block'});
  const state={forbidden:[],errors:[],closing:false};contexts.set(context,state);
  await context.route('**/*',async route=>{
   let actual;
   try{
    const url=new URL(route.request().url());
    if(!allowedOrigins.has(url.origin)||url.username||url.password){state.forbidden.push('unapproved-origin');await abortSafely(route,state);return;}
    const forwarded={...await route.request().allHeaders()};
    // API transport has its own shared cookie jar. Explicitly preserve an
    // absent browser Cookie header, including credentials:'omit' requests.
    forwarded.cookie=forwarded.cookie??'';
    // Native cookies authenticate only their own origin. Never reuse the
    // contained development OIDC token or an injected protection header.
    for(const name of Object.keys(forwarded))if(/^x-vercel-(?:trusted-oidc-idp-token|protection-bypass)$/i.test(name))delete forwarded[name];
    actual=await route.fetch({headers:forwarded,maxRedirects:0,timeout:20000});
    const location=actual.headers().location;
    if(actual.status()>=300&&actual.status()<400&&location){
     const next=new URL(location,url);
     if(!allowedOrigins.has(next.origin)||next.username||next.password){state.forbidden.push('unapproved-redirect');await abortSafely(route,state);return;}
    }
    // Preserve the actual provider status, headers and body without fixtures.
    await route.fulfill({response:actual});
   }catch{if(!state.closing)state.errors.push('guarded-route-operation-failed');await abortSafely(route,state);}
   finally{if(actual)try{await actual.dispose();}catch{if(!state.closing)state.errors.push('guarded-response-dispose-failed');}}
  });
  const page=await context.newPage();page.on('pageerror',()=>state.errors.push('pageerror'));
  await page.goto(share.href,{waitUntil:'domcontentloaded',timeout:30000});
  await expect.poll(()=>{const u=new URL(page.url());return u.origin===origin&&u.pathname==='/'&&!u.search&&!u.hash;},{timeout:30000,message:'Share session must redirect to a clean staging URL'}).toBe(true);
  await expect(page.locator('main h1')).toHaveCount(1);await rememberCookies(context);
  return {context,page,state};
 };
 const anonymous=await fetch(origin,{redirect:'manual',signal:AbortSignal.timeout(20000)});assert.ok([302,307,401].includes(anonymous.status));
 browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'msedge'}:{})});
 const assets=await protectedContext({viewport:{width:1440,height:900}});
 const get=async path=>{
  const u=new URL(path,origin);assert.ok(u.origin===origin&&!u.username&&!u.password&&!u.search&&!u.hash,'Hosted asset must stay on the exact staging origin');
  const actual=await assets.context.request.get(u.href,{maxRedirects:0,timeout:20000});
  try{assert.equal(actual.status(),200,'Hosted asset status '+u.pathname);return {headers:actual.headers(),body:await actual.text()};}
  finally{await actual.dispose();}
 };
 const root=await get('/');
 for(const h of ['strict-transport-security','content-security-policy','x-content-type-options','x-frame-options','referrer-policy'])assert.ok(root.headers[h],'Required header '+h);
 const entry=root.body.match(/<script[^>]+src="(\/assets\/[^"?]+\.js)"/);assert.ok(entry);
 const queue=[entry[1]],seen=new Set(),sources=[];
 for(let i=0;i<queue.length;i++){
  assert.ok(queue.length<=60);const path=queue[i];if(seen.has(path))continue;seen.add(path);
  const {body}=await get(path);sources.push(body);
  for(const m of body.matchAll(/["']((?:\.\/|\/assets\/)[^"'?#]+\.js)["']/g)){const child=new URL(m[1],new URL(path,origin));assert.ok(child.origin===origin&&child.pathname.startsWith('/assets/'),'Imported asset must stay on isolated staging');if(!queue.includes(child.pathname))queue.push(child.pathname);}
 }
 const code=sources.join('\n');assert.ok(code.includes(client.url));assert.ok(code.includes(client.anonKey));
 assert.ok(!code.includes('hyhsppiitijkuvpyswce.supabase.co'));assert.ok(!code.includes('fslbgxefrqpalyisyulk.supabase.co'));
 assert.ok(!/\bsb_secret_[A-Za-z0-9_-]{16,}\b/.test(root.body+'\n'+code),'Published HTML/JavaScript must contain no modern secret key');
 for(const m of code.matchAll(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)){let payload;try{payload=JSON.parse(Buffer.from(m[0].split('.')[1],'base64url').toString());}catch{throw new Error('Published JWT payload must be valid; values withheld');}assert.ok(payload.role==='anon'&&payload.ref===stagingRef,'Published JWT must be an anonymous key for exact staging');}
 // Modern public keys are opaque. The public settings endpoint genuinely
 // checks acceptance by the declared project without reading user rows.
 const scopedKey=await fetch(client.url+'/auth/v1/settings',{headers:{apikey:client.anonKey},redirect:'error',signal:AbortSignal.timeout(20000)});
 assert.equal(scopedKey.status,200,'The declared public key must be accepted by isolated staging');
 await teardown(assets.context);assert.equal(assets.state.forbidden.length,0,'No unapproved artifact origin or redirect');assert.equal(assets.state.errors.length,0,'No artifact bootstrap or teardown error');
 receipt.checks.push({label:'protected preview, security headers, staging-only published API/key and no privileged key',status:'PASS',anonymousStatus:anonymous.status,assets:seen.size,keyKind,stagingKeyScopeStatus:scopedKey.status,entryHash:createHash('sha256').update(sources[0]).digest('hex'),publishedJavaScriptSHA256:createHash('sha256').update(code).digest('hex')});
 console.log('PASS hosted public: artifact isolation and protection');
 await mkdir('artifacts/public-launch/hosted-public',{recursive:true});
 for(const locale of ['en','ms'])for(const theme of ['light','dark']){
  const {context,page,state}=await protectedContext({viewport:{width:1440,height:900},colorScheme:theme});
  await page.getByRole('combobox',{name:'Language',exact:true}).selectOption(locale);
  const themeName=locale==='ms'?'Tukar tema warna':'Switch colour theme';
  const isDark=()=>page.locator('html').evaluate(e=>e.classList.contains('dark'));
  if(await isDark()!==(theme==='dark'))await page.getByRole('button',{name:themeName,exact:true}).click();
  for(const path of ['/','/demo','/privacy','/terms','/login']){
   active=locale+'/'+theme+' '+path;await page.goto(origin+path,{waitUntil:'domcontentloaded',timeout:30000});
   await expect(page.locator('main h1')).toHaveCount(1);await expect(page.locator('main h1')).toBeVisible();
   assert.equal(new URL(page.url()).origin,origin);assert.equal(await isDark(),theme==='dark');
   const widths=[];
   for(const width of [320,390,768,1024,1440]){
    await page.setViewportSize({width,height:900});
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1);assert.equal(overflow,false,'Horizontal overflow '+active+'/'+width);
    widths.push(width);
   }
   await page.setViewportSize({width:locale==='ms'?390:1440,height:900});
   const axe=await bounded(new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze(),60000,'Accessibility scan '+active);
   receipt.axe.push({path,locale,theme,violations:axe.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.length}))});
   assert.equal(axe.violations.length,0,'Axe violations '+active);
   await page.keyboard.press('Tab');
   const focused=await page.evaluate(()=>({tag:document.activeElement?.tagName,hidden:document.activeElement?.getAttribute('aria-hidden')}));assert.notEqual(focused.tag,'BODY');assert.notEqual(focused.hidden,'true');
   receipt.checks.push({label:active,status:'PASS',responsiveWidths:widths,keyboardFocusable:true});
   console.log('PASS hosted public route: '+active);
   if(path==='/')await page.screenshot({path:'artifacts/public-launch/hosted-public/home-'+locale+'-'+theme+'.jpg',fullPage:false,type:'jpeg'});
  }
  if(locale==='en'&&theme==='light')for(const tab of ['dashboard','transactions','analytics','accounting','accounts','plans','goals','savings','debts','categories','payments','settings','notes','reminders','notifications','calendar']){
   active='anonymous private route /'+tab;await page.goto(origin+'/'+tab,{waitUntil:'domcontentloaded',timeout:30000});
   await expect(page).toHaveURL(u=>u.origin===origin&&u.pathname==='/login'&&u.searchParams.get('next')==='/'+tab,{timeout:30000});
   await expect(page.getByRole('heading',{name:'Your money. A clearer picture.',exact:true})).toBeVisible();
   const u=new URL(page.url());assert.equal(u.pathname,'/login');assert.equal(u.searchParams.get('next'),'/'+tab);
   receipt.checks.push({label:active,status:'PASS'});
   console.log('PASS hosted anonymous guard: /'+tab);
  }
  await teardown(context);assert.equal(state.forbidden.length,0,'No unapproved origin or redirect');assert.equal(state.errors.length,0,'No page, route or teardown error');
  console.log('PASS hosted public: '+locale+'/'+theme);
 }
 receipt.status='PASS';
}catch(error){receipt.status='FAIL';receipt.failure={step:active,message:redact(error.message)};console.error('FAIL hosted public:',receipt.failure.step);process.exitCode=1;}
finally{
 for(const context of [...contexts.keys()]){const state=await teardown(context);if(state.errors.length||state.forbidden.length){receipt.status='FAIL';receipt.teardownFailure='Guarded browser cleanup failed; private details withheld';process.exitCode=1;}}
 try{await bounded(browser?.close(),30000,'Browser close');}catch{receipt.status='FAIL';receipt.teardownFailure='Browser cleanup failed; private details withheld';process.exitCode=1;}
 receipt.finishedAt=new Date().toISOString();await mkdir('artifacts/public-launch',{recursive:true});
 await writeFile('artifacts/public-launch/hosted-public-browser-acceptance.json',JSON.stringify(receipt,null,2));
  await writeFile(`artifacts/public-launch/hosted-public-${runId}.json`,JSON.stringify(receipt,null,2));
 console.log(JSON.stringify({status:receipt.status,checks:receipt.checks.length,axeScans:receipt.axe.length,failure:receipt.failure??null,teardownFailure:receipt.teardownFailure??null}));
}
