import { expect, test } from '@playwright/test';
import { mockSignedInApp, rows, supabaseUrl } from './fixtures';

test('planning retrieves budgets and recurring rules beyond the API page limit', async ({ page }) => {
  await mockSignedInApp(page);
  const userId = (rows.profiles[0] as {id:string}).id;
  rows.categories = [{id:'history',user_id:userId,name:'Historical budget',type:'expense',color:'#148575',created_at:''}];
  const budgets = Array.from({length:1000}, (_, index) => {
    const date = new Date('2110-12-01T12:00:00Z'); date.setUTCMonth(date.getUTCMonth() - index);
    return {id:'budget-'+index,user_id:userId,category_id:'history',month:date.toISOString().slice(0,10),currency:'MYR',amount:'10.00',spent:'0.00',created_at:''};
  });
  budgets.push({...budgets[0],id:'older-budget',month:'1999-01-01',amount:'20.00',spent:'0.10'});
  const rule = {user_id:userId,currency:'MYR',amount:'1.00',type:'expense',account_id:null,category_id:null,payment_method_id:null,start_date:'2030-01-01',end_date:null,frequency:'monthly',interval:1,next_index:0,active:false,created_at:'2020-01-01T00:00:00Z'};
  const rules = Array.from({length:1001}, (_, index) => ({...rule,id:'rule-'+String(index).padStart(4,'0'),description:index===1000?'Rule beyond first API page':'Earlier rule '+index}));
  const requests: Record<string,number[]> = {exact_monthly_budgets:[],exact_recurring_rules:[]};
  for (const [resource, values] of [['exact_monthly_budgets',budgets],['exact_recurring_rules',rules]] as const) {
    await page.route(supabaseUrl+'/rest/v1/'+resource+'*', route => {
      const query = new URL(route.request().url()).searchParams;
      expect(query.get('user_id')).toBe('eq.'+userId);
      const offset = Number(query.get('offset')??0), limit = Number(query.get('limit')??1000);
      requests[resource].push(offset);
      return route.fulfill({json:values.slice(offset,offset+limit)});
    });
  }
  await page.goto('/plans');
  await page.getByRole('button',{name:'Budgets',exact:true}).click();
  await page.getByLabel('Month',{exact:true}).fill('1999-01');
  const list = page.locator('main li').filter({hasText:'Historical budget'});
  await expect(list).toContainText('0.10'); await expect(list).toContainText('20.00');
  await page.getByRole('button',{name:'Recurring activity',exact:true}).click();
  await expect(page.getByText('Rule beyond first API page',{exact:true})).toBeVisible();
  expect(requests.exact_monthly_budgets).toContain(1000);
  expect(requests.exact_recurring_rules).toContain(1000);
});
