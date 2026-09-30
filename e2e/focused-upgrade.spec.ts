import {expect,test} from '@playwright/test';
import {mockSignedInApp} from './fixtures';
test.beforeEach(async ({ page }) => { await mockSignedInApp(page); });

test('dashboard hierarchy, semantic cash-flow colors, transaction accounts, and mobile drawer', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Tracked net flow')).toBeVisible();
  await expect(page.getByText('Linked account position')).toBeVisible();
  await expect(page.getByText('YOUR DIRECTION')).toHaveCount(0);
  await expect(page.getByRole('heading', { name:'Financial progress' })).toHaveCount(0);
  const order = await page.locator('.app-main').evaluate(main => ({ kpi:main.querySelector('.metric-grid')?.getBoundingClientRect().top, summary:main.querySelector('[aria-label="Financial summary"]')?.getBoundingClientRect().top, chart:main.querySelector('.dashboard-chart-grid')?.getBoundingClientRect().top }));
  expect(order.kpi).toBeLessThan(order.summary!); expect(order.summary).toBeLessThan(order.chart!);
  await expect(page.locator('.cash-flow-income')).toHaveCSS('color','rgb(4, 120, 87)');
  await expect(page.locator('.cash-flow-expense')).toHaveCSS('color','rgb(220, 38, 38)');
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
  expect(requests.some(item=>item.includes('PATCH https://fixture.supabase.co/rest/v1/accounts')&&item.includes('125.00'))).toBeTruthy();
  await page.getByRole('button',{name:'Delete Daily spending'}).click();
  await expect(page.getByRole('alert').filter({hasText:'1 linked financial record'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Delete account'})).toBeDisabled();
  await page.keyboard.press('Escape');

  for (const [path, row, label] of [['/goals','Emergency fund','Delete Emergency fund'],['/savings','Travel fund','Delete Travel fund'],['/debts','Alex','Delete debt with Alex']] as const) {
    await page.goto(path); await page.getByRole('button',{name:new RegExp(row)}).first().click(); await page.getByRole('button',{name:label}).click(); await page.getByRole('button',{name:'Delete permanently'}).click();
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
