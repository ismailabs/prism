import {expect,test} from '@playwright/test';
import {mockSignedInApp, rows, supabaseUrl} from './fixtures';
test.beforeEach(async ({ page }) => { await mockSignedInApp(page); });

for (const language of ['en', 'ms']) test(`debt history blocks parent deletion in ${language}`, async ({page}) => {
  (rows.profiles[0] as {language:string}).language=language;
  rows.debt_repayments=[{id:'repayment-1',debt_id:'debt-1',currency:'MYR',amount:'20.10',account_id:'account-1',transaction_id:null,paid_at:'2000-01-01T00:00:00Z',note:'',created_at:''}];
  const deletions:string[]=[];
  page.on('request',request=>{if(request.method()==='DELETE')deletions.push(request.url());});
  await page.goto('/debts');
  await page.locator('button.selection-card').filter({has:page.getByRole('heading',{name:'Alex',exact:true})}).click();
  await expect(page.getByRole('button',{name:language==='en'?'Delete debt with Alex':'Padam hutang dengan Alex',exact:true})).toBeDisabled();
  await expect(page.getByRole('alert').filter({hasText:language==='en'?'This debt has repayments':'Hutang ini mempunyai bayaran balik'})).toBeVisible();
  await expect(page.getByRole('button',{name:language==='en'?'Delete permanently':'Padam kekal'})).toHaveCount(0);
  expect(deletions).toEqual([]);
  expect(rows.person_debts).toHaveLength(1);expect(rows.debt_repayments).toHaveLength(1);
});

for (const language of ['en', 'ms']) test(`debt deletion checks server history when the cached list is empty in ${language}`,async({page})=>{
  rows.profiles[0].language=language;
  await page.route(supabaseUrl+'/rest/v1/debt_repayments?**',route=>route.fulfill({json:[{id:'new-repayment'}]}));
  const deletions:string[]=[];
  page.on('request',request=>{if(request.method()==='DELETE')deletions.push(request.url());});
  await page.goto('/debts');await page.locator('button.selection-card').filter({has:page.getByRole('heading',{name:'Alex',exact:true})}).click();
  await page.getByRole('button',{name:language==='en'?'Delete debt with Alex':'Padam hutang dengan Alex',exact:true}).click();
  const checked=page.waitForResponse(response=>response.url().startsWith(supabaseUrl+'/rest/v1/debt_repayments?')&&response.status()===200);
  await page.getByRole('button',{name:language==='en'?'Delete permanently':'Padam kekal',exact:true}).click();await checked;
  await expect(page.getByText(language==='en'?'Debt has repayment history. Keep this record until reversal support is available.':'Hutang mempunyai sejarah bayaran balik. Kekalkan rekod ini sehingga sokongan pembalikan tersedia.',{exact:true})).toBeVisible();
  expect(deletions).toEqual([]);expect(rows.person_debts).toHaveLength(1);
});

test('dashboard hierarchy, semantic cash-flow colors, transaction accounts, and mobile drawer', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Tracked net flow', {exact:false})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Your accounts'})).toBeVisible();
  await expect(page.getByText('YOUR DIRECTION')).toHaveCount(0);
  await expect(page.getByRole('heading', { name:'Financial progress' })).toHaveCount(0);
  const order = await page.locator('.app-main').evaluate(main => ({ kpi:main.querySelector('.snapshot')?.getBoundingClientRect().top, summary:main.querySelector('[aria-label="Financial summary"]')?.getBoundingClientRect().top, chart:main.querySelector('.module-cashFlow')?.getBoundingClientRect().top }));
  expect(order.kpi).toBeLessThan(order.chart!); expect(order.chart).toBeLessThan(order.summary!);
  await expect(page.locator('.cash-flow-income i')).toHaveCSS('background-color','rgb(8, 119, 95)');
  await expect(page.locator('.cash-flow-expense i')).toHaveCSS('background-color','rgb(180, 66, 66)');
  await page.getByRole('link',{name:'Transactions'}).click();
  await expect(page.getByRole('heading',{name:'Accounts'})).toBeVisible();
  await expect(page.getByText('Everyday account')).toBeVisible();
  await page.setViewportSize({width:390,height:844});
  await expect(page.locator('.app-nav')).toBeHidden();
  await page.getByRole('button',{name:'Open navigation'}).click();
  const drawer=page.getByRole('dialog',{name:'Workspace'});
  await expect(drawer).toBeVisible();
  await drawer.getByRole('link',{name:/Plans/}).click();
  await expect(drawer).toBeHidden();
  await page.getByRole('button',{name:'Open navigation'}).click();
  await page.keyboard.press('Escape');
  await expect(drawer).toBeHidden();
});

test('account editing and all focused delete confirmations use real mutations', async ({ page }) => {
  const requests:string[]=[];
  page.on('request',request=>{if(['PATCH','DELETE','POST'].includes(request.method()))requests.push(`${request.method()} ${request.url()} ${request.postData()??''}`);});
  await page.goto('/accounts');
  await page.getByRole('button',{name:'Edit'}).first().click();
  await page.getByLabel('Account name').fill('Daily spending');
  await page.getByLabel('Opening balance').fill('125.00');
  await page.getByRole('button',{name:'Save account'}).click();
  await expect(page.getByText('Account saved')).toBeVisible();
  expect(requests.some(item=>item.includes(`PATCH ${supabaseUrl}/rest/v1/accounts`)&&item.includes('125.00'))).toBeTruthy();
  await page.getByRole('button',{name:'Delete Daily spending'}).click();
  await expect(page.getByRole('alert').filter({hasText:'1 linked financial record'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Delete account'})).toBeDisabled();
  await page.keyboard.press('Escape');

  for (const [path, row, label] of [['/goals','Emergency fund','Delete Emergency fund'],['/savings','Travel fund','Delete Travel fund'],['/debts','Alex','Delete debt with Alex']] as const) {
    await page.goto(path); await page.getByRole('button',{name:new RegExp(row)}).first().click(); await page.getByRole('button',{name:label}).click();
    const beforeDelete=requests.filter(item=>item.startsWith('DELETE')).length;
    await page.getByRole('button',{name:'Delete permanently'}).click();
    await expect.poll(()=>requests.filter(item=>item.startsWith('DELETE')).length).toBe(beforeDelete+1);
  }
  expect(requests.filter(item=>item.startsWith('DELETE')).length).toBeGreaterThanOrEqual(3);
});

test('account deletion danger zone requires the signed-in email and calls the server RPC', async ({ page }) => {
  let rpcBody='';
  page.on('request',request=>{if(request.url().includes('/rpc/delete_own_account'))rpcBody=request.postData()??'';});
  await page.goto('/settings');
  await page.getByRole('button',{name:'Delete Prism account'}).click();
  const confirm=page.getByLabel(/Type DELETE test@example.com/);
  await confirm.fill('DELETE');
  await expect(page.getByRole('button',{name:'Delete forever'})).toBeDisabled();
  await confirm.fill('DELETE test@example.com');
  await page.getByRole('button',{name:'Delete forever'}).click();
  await expect.poll(()=>rpcBody).toContain('DELETE');
});
