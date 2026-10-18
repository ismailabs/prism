import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockSignedInApp, rows, userId, authStorageKey, supabaseUrl } from './fixtures';

function ownedResponse(page: Parameters<typeof mockSignedInApp>[0], resource: string) {
  return page.waitForResponse(response=>{const url=new URL(response.url());return url.origin===supabaseUrl&&url.pathname===`/rest/v1/${resource}`&&url.searchParams.get('user_id')===`eq.${userId}`&&response.status()===200;});
}

for (const scenario of [
  { name:'positive', september:'700.00',october:'850.00',available:'900.00',remaining:'50.00',notices:0 },
  { name:'negative', september:'900.00',october:'750.00',available:'700.00',remaining:'-50.00',notices:1 },
]) test(`${scenario.name} rollover agrees across overview, budgets and ordinary financial reporting`, async ({page}) => {
  await mockSignedInApp(page);
  await page.clock.setFixedTime(new Date('2026-10-10T04:00:00Z'));
  rows.categories = [{id:'food',user_id:userId,name:'Food',type:'expense',color:'#123456',created_at:''}];
  rows.monthly_budgets = ['2026-09-01','2026-10-01'].map((month,i)=>({id:`budget-${i}`,user_id:userId,category_id:'food',currency:'MYR',month,amount:'800.00',rollover_enabled:i===1,alert_percent:100,created_at:''}));
  rows.transactions = [
    ...[[ '2026-09-02', scenario.september ],[ '2026-10-02',scenario.october ]].map(([date,amount],i)=>({id:`expense-${i}`,user_id:userId,account_id:'account-1',type:'expense',category_id:'food',currency:'MYR',amount,description:'Recorded food',transaction_date:`${date}T00:00:00Z`,created_at:'',activity_kind:'ordinary'})),
    {id:'earmark',user_id:userId,account_id:'account-1',type:'expense',category_id:'food',currency:'MYR',amount:'500.00',description:'Goal allocation',transaction_date:'2026-10-02T00:00:00Z',created_at:'',activity_kind:'savings_allocation'},
    {id:'principal',user_id:userId,account_id:'account-1',type:'expense',category_id:'food',currency:'MYR',amount:'480.00',description:'Linked principal',transaction_date:'2026-10-02T00:00:00Z',created_at:'',activity_kind:'debt_principal'},
  ];
  for (const tx of rows.transactions as Record<string,unknown>[]) tx.payment_method_id = null;
  const original = structuredClone({transactions:rows.transactions,accounts:rows.accounts,transfers:rows.transfers,debt_repayments:rows.debt_repayments});
  const persistedAccounts = () => rows.accounts.map(account => { const copy = {...account as Record<string,unknown>}; delete copy.balance; return copy; });
  await Promise.all([ownedResponse(page,'finance_daily_totals'),ownedResponse(page,'exact_monthly_budgets'),page.goto('/dashboard')]);
  await page.locator('.loading-state').waitFor({state:'hidden'});
  await expect(page.getByRole('region', {name:'Budget health',exact:true})).toContainText(`${scenario.notices} threshold notices`);
  const highlights = page.getByRole('region',{name:'Planning highlights'});
  if (scenario.notices) {
    await expect(highlights).toContainText('Budget reached: Food');
    await expect(highlights).toContainText(/750\.00\s*\/\s*MYR\s*700\.00/);
    await highlights.getByRole('button',{name:'Review budgets'}).click();
  } else {
    await expect(highlights).toHaveCount(0);
    await page.goto('/plans?section=budgets');
  }
  const budget = page.getByRole('region',{name:'Budget planning'});
  await expect(budget.getByText('Available', {exact:true}).locator('..').getByRole('definition')).toHaveText(`MYR ${scenario.available}`);
  await expect(budget.getByText('Posted eligible expense', {exact:true}).locator('..').getByRole('definition')).toHaveText(`MYR ${scenario.october}`);
  await expect(budget.getByText('Remaining', {exact:true}).locator('..').getByRole('definition')).toHaveText(scenario.remaining.startsWith('-')?`-MYR ${scenario.remaining.slice(1)}`:`MYR ${scenario.remaining}`);
  if (scenario.notices) await expect(budget.getByText(/Over budget/)).toBeVisible();
  await page.screenshot({path:`artifacts/integration/budget-${scenario.name}.png`,fullPage:true});
  await Promise.all([ownedResponse(page,'finance_daily_totals'),ownedResponse(page,'exact_monthly_budgets'),page.goto('/dashboard')]);
  await page.locator('.loading-state').waitFor({state:'hidden'});
  await expect(page.getByRole('region', {name:'Budget health',exact:true})).toContainText(`${scenario.notices} threshold notices`);
  await expect(page.locator('.snapshot')).toContainText(scenario.october);
  expect({transactions:rows.transactions,accounts:persistedAccounts(),transfers:rows.transfers,debt_repayments:rows.debt_repayments}).toEqual(original);
  expect((rows.accounts[0] as Record<string,unknown>).balance).toBe(scenario.name === 'positive' ? '-2430.00' : '-2530.00');
});

test('accounting deep link preserves the guarded login destination',async({page})=>{
  await mockSignedInApp(page);
  await page.addInitScript(key=>localStorage.removeItem(key),authStorageKey);
  await page.goto('/accounting');
  await expect(page).toHaveURL(/\/login\?next=%2Faccounting$/);
  await expect(page.getByRole('heading',{name:'Your money. A clearer picture.'})).toBeVisible();
});

test('MFA protects the accounting destination before querying private data',async({page})=>{
  await mockSignedInApp(page);
  await page.addInitScript(key=>{const value=JSON.parse(localStorage.getItem(key)!);value.user.factors=[{id:'factor-1',factor_type:'totp',status:'verified',friendly_name:'Fixture authenticator'}];localStorage.setItem(key,JSON.stringify(value));},authStorageKey);
  await page.route(supabaseUrl+'/auth/v1/user',route=>route.fulfill({json:{id:userId,factors:[{id:'factor-1',factor_type:'totp',status:'verified'}]}}));
  await page.route(supabaseUrl+'/rest/v1/rpc/financial_access_status',route=>route.fulfill({json:{allowed:false,reason:'needs_mfa',approvedFactorIds:['factor-1','factor-2'],mailboxVerified:false,activated:true}}));
  const requests:string[]=[];page.on('request',request=>{if(request.url().includes('/rest/v1/')&&!request.url().endsWith('/rpc/financial_access_status'))requests.push(request.url());});
  await page.goto('/login?next=%2Faccounting');
  await expect(page.getByRole('heading',{name:'One more layer of security'})).toBeVisible();
  expect(requests).toEqual([]);
  await expect(page.locator('.app-shell')).toHaveCount(0);
});

for(const locale of ['en','ms'] as const) test(`integrated synthetic accounting viewer is accessible, exact and read only in ${locale}`,async({page})=>{
  await mockSignedInApp(page);Object.assign(rows.profiles[0] as object,{language:locale});
  await page.setViewportSize({width:375,height:812});
  const before=structuredClone(rows);const writes:string[]=[];
  page.on('request',request=>{if(request.url().includes('/rest/v1/')&&request.method()!=='GET')writes.push(request.url());});
  await page.goto('/accounting');
  await expect(page.getByRole('heading',{name:locale==='en'?'Accounting laboratory':'Makmal perakaunan',exact:true})).toBeVisible();
  await page.getByRole('button',{name:locale==='en'?'Synthetic example':'Contoh rekaan',exact:true}).click();
  await expect(page.getByRole('region',{name:locale==='en'?'Balance sheet':'Kunci kira-kira'})).toContainText('15,280.00');
  const equation=page.getByRole('status').filter({hasText:locale==='en'?'Exact equation difference':'Perbezaan persamaan tepat'});
  await expect(equation).toContainText('0.00');
  await expect(page.getByText(locale==='en'?'Synthetic fixtures only.':'Data rekaan sahaja.',{exact:false})).toBeVisible();
  const nativeCurrency=page.getByRole('combobox',{name:locale==='en'?'Native currency':'Mata wang asal',exact:true});
  const sheet=page.getByRole('region',{name:locale==='en'?'Balance sheet':'Kunci kira-kira',exact:true});
  for(const code of ['USD','EUR','JPY']) {
    await nativeCurrency.selectOption(code);
    await expect(equation).toContainText(`${code} ·`);
    expect((await sheet.getByRole('definition').allTextContents()).map(value=>value.replace(/[^\d.,-]/g,''))).toEqual(Array(4).fill(code==='JPY'?'0':'0.00'));
    await expect(page.getByRole('region',{name:locale==='en'?'Journal detail':'Butiran jurnal',exact:true})).toContainText(locale==='en'?'No posted entries in this currency.':'Tiada catatan dalam mata wang ini.');
  }
  await nativeCurrency.selectOption('MYR');await expect(sheet).toContainText('15,280.00');
  const scroll=page.getByRole('region',{name:locale==='en'?'Scroll ledger accounts':'Tatal akaun lejar',exact:true});
  expect(await scroll.locator('tbody td:last-child').evaluateAll(cells=>cells.every(cell=>{const range=document.createRange();range.selectNodeContents(cell);return range.getClientRects().length===1;}))).toBe(true);
  await scroll.focus();await scroll.press('ArrowRight');
  await expect.poll(()=>scroll.evaluate(element=>element.scrollLeft)).toBeGreaterThan(0);
  const opening='legacy:accounts:20000000-0000-4000-8000-000000000001';
  await page.locator('summary').filter({hasText:opening}).press('Enter');
  const journal=page.getByRole('region',{name:`${locale==='en'?'Scroll journal':'Tatal jurnal'} ${opening}`,exact:true});
  await expect(journal).toBeVisible();await journal.focus();await journal.press('ArrowRight');
  await expect.poll(()=>journal.evaluate(element=>element.scrollLeft)).toBeGreaterThan(0);
  const audit=await new AxeBuilder({page}).analyze();expect(audit.violations).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.screenshot({path:`artifacts/integration/accounting-${locale}.png`,fullPage:true});
  await page.getByLabel(locale==='en'?'Through':'Sehingga',{exact:true}).fill('2000-03-01');
  await expect(page.getByRole('alert')).toContainText(locale==='en'?'Choose a valid period':'Pilih tempoh sah');
  await expect(page.getByRole('region',{name:locale==='en'?'Balance sheet':'Kunci kira-kira'})).toHaveCount(0);
  expect(writes).toEqual([]);
  const persisted=structuredClone(rows); for(const account of persisted.accounts as Record<string,unknown>[]) delete account.balance;
  expect(persisted).toEqual(before);
});
