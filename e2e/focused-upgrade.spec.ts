import { expect, test, type Page, type Route } from '@playwright/test';

const userId = '11111111-1111-4111-8111-111111111111';
const now = Math.floor(Date.now() / 1000);
const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
const accessToken = `${encode({ alg: 'none', typ: 'JWT' })}.${encode({ sub: userId, email: 'test@example.com', role: 'authenticated', aud: 'authenticated', aal: 'aal1', session_id: '22222222-2222-4222-8222-222222222222', exp: now + 3600 })}.fixture`;
const user = { id: userId, email: 'test@example.com', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, identities: [], created_at: new Date().toISOString() };
const rows: Record<string, unknown[]> = {
  profiles: [{ id:userId, username:'Test member', currency:'MYR', language:'en', theme:'light', mfa_enabled:false, created_at:new Date().toISOString() }],
  categories: [], payment_methods: [],
  transactions: [{ id:'tx-1', user_id:userId, amount:'25.00', currency:'MYR', type:'expense', category_id:null, payment_method_id:null, account_id:'account-1', description:'Groceries', transaction_date:'2026-09-20T00:00:00Z', created_at:'2026-09-20T00:00:00Z' }],
  accounts: [{ id:'account-1', user_id:userId, name:'Everyday account', currency:'MYR', opening_balance:'100.00', archived:false, created_at:'2026-09-01T00:00:00Z' },{ id:'account-2', user_id:userId, name:'Empty account', currency:'USD', opening_balance:'50.00', archived:false, created_at:'2026-09-01T00:00:00Z' }],
  objectives: [{ id:'goal-1', user_id:userId, kind:'goal', name:'Emergency fund', notes:'', category:'Safety', priority:'high', target_amount:'500.00', currency:'MYR', target_date:null, status:'active', created_at:'', updated_at:'' },{ id:'save-1', user_id:userId, kind:'savings', name:'Travel fund', notes:'', category:'Travel', priority:'normal', target_amount:'300.00', currency:'MYR', target_date:null, status:'active', created_at:'', updated_at:'' }],
  objective_contributions: [], objective_milestones: [],
  person_debts: [{ id:'debt-1', user_id:userId, direction:'i_owe', counterparty:'Alex', original_amount:'80.00', currency:'MYR', due_date:null, notes:'', created_at:'', updated_at:'' }],
  debt_repayments: [],
};

async function mockSignedInApp(page: Page) {
  await page.addInitScript(({ token, authUser }) => {
    localStorage.setItem('sb-fixture-auth-token', JSON.stringify({ access_token:token, refresh_token:'fixture-refresh', expires_at:Math.floor(Date.now()/1000)+3600, expires_in:3600, token_type:'bearer', user:authUser }));
  }, { token:accessToken, authUser:user });
  await page.route('https://fixture.supabase.co/**', async route => handleSupabase(route));
}

async function handleSupabase(route: Route) {
  const request = route.request();
  const url = new URL(request.url());
  if (url.pathname === '/auth/v1/user') return route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify(user) });
  if (url.pathname === '/auth/v1/logout') return route.fulfill({ status:204 });
  if (url.pathname === '/rest/v1/rpc/delete_own_account') return route.fulfill({ status:204, contentType:'application/json', body:'' });
  const table = url.pathname.split('/').at(-1) ?? '';
  if (!(table in rows)) return route.fulfill({ status:200, contentType:'application/json', body:'[]' });
  const singular = request.headers().accept?.includes('application/vnd.pgrst.object+json');
  if (request.method() === 'GET') return route.fulfill({ status:200, contentType:'application/json', headers:{'content-range':`0-${Math.max(0,rows[table].length-1)}/${rows[table].length}`}, body:JSON.stringify(singular ? rows[table][0] : rows[table]) });
  const body = request.postDataJSON?.() as Record<string, unknown> | undefined;
  if (request.method() === 'PATCH') {
    const current = rows[table][0] as Record<string, unknown>;
    return route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify(singular ? {...current,...body} : [{...current,...body}]) });
  }
  if (request.method() === 'DELETE') { const deleted={ id:(rows[table][0] as {id:string}).id }; return route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify(singular?deleted:[deleted]) }); }
  return route.fulfill({ status:201, contentType:'application/json', body:JSON.stringify([{id:'created',user_id:userId,...body}]) });
}

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
  await drawer.getByRole('link',{name:/Goals/}).click();
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
  await page.getByRole('button',{name:'Delete Everyday account'}).click();
  await expect(page.getByRole('alert').filter({hasText:'1 linked transaction'})).toBeVisible();
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
