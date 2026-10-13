import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockSignedInApp, rows, supabaseUrl } from './fixtures';
async function setup(page: Parameters<typeof mockSignedInApp>[0]) {
  await page.clock.setFixedTime(new Date('2026-10-01T04:00:00Z'));
  await mockSignedInApp(page);
  const base=rows.transactions[0] as Record<string,unknown>;
  rows.categories=[{id:'investment',user_id:base.user_id,name:'Investment',type:'expense',color:'#00ffff',created_at:''},{id:'salary',user_id:base.user_id,name:'Salary',type:'income',color:'#00ffff',created_at:''}];
  rows.transactions=[
    {...base,id:'now',category_id:'investment',amount:'25.00',transaction_date:'2026-10-01T00:00:00Z'},
    {...base,id:'previous',category_id:'investment',amount:'50.00',transaction_date:'2026-09-20T00:00:00Z'},
    {...base,id:'income',category_id:'salary',type:'income',amount:'300.00',transaction_date:'2026-08-20T00:00:00Z'},
    {...base,id:'old',category_id:'investment',amount:'0.10',transaction_date:'1999-01-05T00:00:00Z'},
  ];
  await page.route('**/api/rates?*',route=>route.fulfill({json:{base:'MYR',rates:{MYR:1,USD:.23,EUR:.21,JPY:34},updatedAt:new Date('2026-10-01T03:00:00Z').getTime(),source:'QA fixture'}}));
}
test('all seven periods stay coherent across Overview, Analytics, custom validation and drilldown',async({page})=>{
  await setup(page);await page.goto('/');
  for(const type of ['month','last-3-months','last-6-months','last-12-months','year-to-date','all-time','custom']) {
    await page.getByLabel('Period',{exact:true}).selectOption(type);
    if(type==='custom') {
      await page.getByLabel('Start date',{exact:true}).fill('2026-09-20');await page.getByLabel('End date',{exact:true}).fill('2026-09-20');await page.getByRole('button',{name:'Apply range',exact:true}).click();
    }
    const total=type==='month'?'25.00':type==='all-time'?'75.10':type==='custom'?'50.00':'75.00';
    await expect(page.locator('.snapshot-metric.expense')).toContainText(total);
    await page.getByRole('link',{name:'Analytics',exact:true}).click();
    await expect(page.getByLabel('Period',{exact:true})).toHaveValue(type);
    await expect(page.locator('.analytics-metric.expense')).toContainText(total);
    if(type==='all-time') await expect(page.locator('.analytics-metrics')).not.toContainText('Previous period');
    await page.getByRole('link',{name:'Overview',exact:true}).click();
  }
  await page.getByLabel('Start date',{exact:true}).fill('2026-10-02');await page.getByRole('button',{name:'Apply range',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('Start date must be');
  await expect(page.locator('.snapshot-metric.expense')).toContainText('50.00');
  const donut=page.getByRole('region',{name:'Spending breakdown',exact:true});
  await donut.getByRole('button',{name:'Select Investment',exact:true}).click();await donut.getByRole('button',{name:'View Investment transactions',exact:true}).click();
  await expect(page).toHaveURL(/from=2026-09-20/);await expect(page).toHaveURL(/to=2026-09-20/);
  await expect(page.locator('.finance-table tbody tr')).toHaveCount(1);
});
test('profile default persists on reload, fresh device and safe sign-out/in with no initial month flicker',async({page,context,browser})=>{
  // This covers several reloads plus a fresh browser context, rather than one
  // interaction. Keep per-assertion deadlines; allow the complete workflow.
  test.slow();
  await setup(page);await page.goto('/settings');
  await page.getByLabel('Default analysis period',{exact:true}).selectOption('last-6-months');
  await expect.poll(()=> (rows.profiles[0] as Record<string,unknown>).default_analysis_period).toBe('last-6-months');
  await page.getByRole('link',{name:'Overview',exact:true}).click();await expect(page.getByLabel('Period',{exact:true})).toHaveValue('last-6-months');
  await page.reload();await expect(page.getByLabel('Period',{exact:true})).toHaveValue('last-6-months');
  await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(page.getByRole('heading',{name:'Your money. A clearer picture.'})).toBeVisible();
  await page.reload();await expect(page.getByLabel('Period',{exact:true})).toHaveValue('last-6-months');
  const serverProfile=structuredClone(rows.profiles);
  const fresh=await browser.newContext();const device=await fresh.newPage();
  await mockSignedInApp(device);rows.profiles=serverProfile;
  await device.goto('/analytics');await expect(device.getByLabel('Period',{exact:true})).toHaveValue('last-6-months');await fresh.close();
  await page.goto('/settings');await page.getByLabel('Default analysis period',{exact:true}).selectOption('year-to-date');
  await page.getByRole('link',{name:'Analytics',exact:true}).click();await expect(page.getByLabel('Period',{exact:true})).toHaveValue('year-to-date');
  await page.goto('/settings');await page.getByRole('button',{name:'Reset analysis period to current month',exact:true}).click();
  await expect.poll(()=> (rows.profiles[0] as Record<string,unknown>).default_analysis_period).toBe('month');
  expect(await context.storageState()).toBeTruthy();
});
test('category color create/edit/delete uses current identity on every chart, legend, card and transaction',async({page})=>{
  // Includes both themes, reloads, failed/successful deletion and every surface.
  test.slow();
  await setup(page);await page.goto('/');
  await expect(page.locator('.snapshot')).toBeVisible({timeout:30_000});
  await expect(page.locator('.donut-segment').first()).toHaveAttribute('stroke','#00ffff');
  await page.getByRole('link',{name:'Settings',exact:true}).click();await page.getByRole('button',{name:'Categories',exact:true}).click();
  await page.getByRole('button',{name:'Edit Investment',exact:true}).click();
  await page.getByRole('dialog').locator('input[pattern]').fill('#a855f7');await page.getByRole('dialog').getByRole('button',{name:'Save changes',exact:true}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.locator('article').filter({hasText:'Investment'}).locator('.list-item-icon')).toHaveCSS('color','rgb(168, 85, 247)');
  await page.getByRole('link',{name:'Overview',exact:true}).click();
  const verify=async()=>{
    // Lazy analytics can still show its loading state after the navigation and
    // theme save finish. Wait for this route's data, as the other setup checks do.
    await expect(page.locator(new URL(page.url()).pathname==='/analytics'?'.analytics-metric.expense':'.snapshot-metric.expense')).toBeVisible({timeout:20_000});
    await expect(page.locator('.donut-segment').first()).toHaveAttribute('stroke','#a855f7');
    await expect(page.locator('.category-key').first()).toHaveCSS('border-color','rgb(168, 85, 247)');
  };
  await verify();await page.getByLabel('Period',{exact:true}).selectOption('all-time');await verify();
  await page.screenshot({path:'artifacts/period-color-overview.png',fullPage:true});
  await page.getByRole('link',{name:'Analytics',exact:true}).click();await verify();
  await page.screenshot({path:'artifacts/period-color-analytics.png',fullPage:true});
  await expect(page.getByRole('region',{name:'Income by category'}).locator('.donut-segment')).toHaveAttribute('stroke','#00ffff');
  await page.reload();await page.getByLabel('Period',{exact:true}).selectOption('all-time');await verify();
  for(const theme of ['dark','light']) {
    await page.goto('/settings');await page.getByRole('button',{name:theme==='dark'?'Dark':'Light',exact:true}).click();await page.getByRole('button',{name:'Save changes',exact:true}).click();
    await page.getByRole('link',{name:'Analytics',exact:true}).click();await page.getByLabel('Period',{exact:true}).selectOption('all-time');await verify();
  }
  await page.goto('/transactions');const investmentDots=page.getByRole('table').locator('.category-badge').filter({hasText:'Investment'}).locator('.category-dot');await expect(investmentDots).toHaveCount(3);for(const dot of await investmentDots.all())await expect(dot).toHaveCSS('background-color','rgb(168, 85, 247)');
  await page.goto('/categories');await page.getByRole('button',{name:'Add category',exact:true}).click();await page.getByLabel('Name',{exact:true}).fill('Temporary QA');await page.getByRole('dialog').locator('input[pattern]').fill('#000000');await page.getByRole('dialog').getByRole('button',{name:'Create',exact:true}).click();
  await page.getByRole('button',{name:'Delete Temporary QA',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Delete',exact:true}).click();await expect(page.getByText('Temporary QA',{exact:true})).toHaveCount(0);
  await page.route(supabaseUrl+'/rest/v1/categories*',route=>route.request().method()==='DELETE'?route.fulfill({status:409,json:{code:'23503',message:'foreign key violation'}}):route.fallback());
  await page.getByRole('button',{name:'Delete Investment',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Delete',exact:true}).click();await expect(page.getByText('This category is used by budgets or recurring rules.',{exact:false})).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('heading',{name:'Investment',exact:true})).toBeVisible();
  await page.unroute(supabaseUrl+'/rest/v1/categories*');
  await page.getByRole('button',{name:'Delete Investment',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Delete',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Investment',exact:true})).toHaveCount(0);
  await page.goto('/analytics');await page.getByLabel('Period',{exact:true}).selectOption('all-time');
  await expect(page.locator('.analytics-metric.expense')).toContainText('75.10',{timeout:20_000});
  await expect(page.getByRole('region',{name:'Spending breakdown',exact:true}).getByRole('button',{name:'Select Uncategorized',exact:true})).toBeVisible();
});
test('custom controls are accessible and reflow at every requested viewport in English/light and Malay/dark',async({page})=>{
  await setup(page);await page.goto('/settings');
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  for(const locale of ['en','ms']) {
    const profile=rows.profiles[0] as Record<string,unknown>;profile.language=locale;profile.theme=locale==='en'?'light':'dark';
    await page.goto('/analytics');await page.getByLabel(locale==='en'?'Period':'Tempoh',{exact:true}).selectOption('custom');
    for(const width of [320,360,375,390,414,640,768,1024,1280,1440]) {
      await page.setViewportSize({width,height:900});await expect(page.getByRole('button',{name:locale==='en'?'Apply range':'Gunakan julat',exact:true})).toBeVisible();
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
      expect(await page.locator('.period-selector').evaluate(el=>[...el.querySelectorAll('input,select,button')].every(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1;}))).toBe(true);
    }
    const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(axe.violations).toEqual([]);
  }
  expect(errors).toEqual([]);
});
test('category management counts complete history beyond the recent activity limit',async({page})=>{
  await setup(page);
  const base=rows.transactions[0] as Record<string,unknown>;
  rows.transactions=Array.from({length:55},(_,i)=>({...base,id:'usage-'+i}));
  await page.route(supabaseUrl+'/rest/v1/exact_transactions*',route=>route.fulfill({json:rows.transactions.slice(0,50)}));
  await page.goto('/categories');
  await expect(page.locator('article').filter({hasText:'Investment'})).toContainText('55 transactions');
});
