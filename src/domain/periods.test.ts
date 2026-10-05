import { describe, expect, it, vi, afterEach } from 'vitest';
import { resolveFinancialPeriod, validCalendarDate, periodMonths, defaultSelection, type FinancialPeriodSelection } from './periods';
import { analyzePeriod, categoryColor } from './analytics';
import { cashPoints } from '@/components/analytics/CashFlowChart';
import { dashboardFinancials } from './dashboard';
import { cachePeriodPreference, readPeriodPreference } from '@/store/analysisPreference';
import type { Category, MonthlyTotal } from '@/types';
const now = new Date('2026-10-15T12:00:00Z');
const resolve = (selection: FinancialPeriodSelection, date = now, zone = 'Asia/Kuala_Lumpur') => resolveFinancialPeriod(selection, zone, date);
afterEach(() => vi.unstubAllGlobals());
describe('canonical financial periods', () => {
  it('resolves historical/leap months and clamps elapsed comparisons', () => {
    expect(resolve({type:'month',month:'2024-02'})).toMatchObject({from:'2024-02-01',to:'2024-02-29',previousFrom:'2024-01-01',previousTo:'2024-01-31',partial:false});
    expect(resolve({type:'month',month:'2026-10'})).toMatchObject({to:'2026-10-15',previousTo:'2026-09-15',partial:true});
    expect(resolve({type:'month',month:'2024-03'},new Date('2024-03-31T10:00:00Z'))).toMatchObject({previousTo:'2024-02-29'});
  });
  it.each([[3,'2026-08-01','2026-05-01','2026-07-15'],[6,'2026-05-01','2025-11-01','2026-04-15'],[12,'2025-11-01','2024-11-01','2025-10-15']] as const)('resolves the last %i calendar months including current elapsed activity', (count, from, previousFrom, previousTo) => {
    expect(resolve({type:`last-${count}-months`})).toMatchObject({from,to:'2026-10-15',previousFrom,previousTo,months:count});
  });
  it('uses the financial zone at the UTC year/month boundary', () => {
    const instant = new Date('2026-12-31T17:00:00Z');
    expect(defaultSelection('month','Asia/Kuala_Lumpur',instant)).toEqual({type:'month',month:'2027-01'});
    expect(resolve({type:'last-3-months'},instant)).toMatchObject({from:'2026-11-01',to:'2027-01-01',previousFrom:'2026-08-01',previousTo:'2026-10-01'});
    expect(resolve({type:'last-3-months'},instant,'America/New_York').to).toBe('2026-12-31');
  });
  it.each(['2026-01-01','2026-07-15','2026-12-31'])('resolves YTD at %s', date => {
    expect(resolve({type:'year-to-date',year:2026},new Date(date+'T12:00:00Z'))).toMatchObject({from:'2026-01-01',to:date,previousFrom:'2025-01-01',previousTo:'2025'+date.slice(4)});
  });
  it('compares a historical full year and leap-day YTD', () => {
    expect(resolve({type:'year-to-date',year:2024})).toMatchObject({to:'2024-12-31',previousTo:'2023-12-31',partial:false});
    expect(resolve({type:'year-to-date',year:2024},new Date('2024-02-29T10:00:00Z'))).toMatchObject({to:'2024-02-29',previousTo:'2023-02-28'});
  });
  it.each([['2026-10-15','2026-10-15','2026-10-14'],['2026-09-20','2026-10-09','2026-08-31'],['2025-12-25','2026-01-05','2025-12-13']])('compares inclusive custom %s to %s using equally long prior days', (start,end,previousFrom) => {
    expect(resolve({type:'custom',start,end})).toMatchObject({from:start,to:end,previousFrom});
  });
  it('rejects reversed, missing, impossible and malformed calendar dates', () => {
    for(const [start,end] of [['2026-10-20','2026-10-01'],['','2026-10-01'],['2026-02-29','2026-03-01'],['2026-04-31','2026-05-01'],['2026-1-1','2026-10-01']]) expect(()=>resolve({type:'custom',start,end})).toThrow('Invalid date range');
    expect(validCalendarDate('2024-02-29')).toBe(true);
  });
  it('filters same-day/custom summaries, buckets and drilldown boundaries exactly', () => {
    const period=resolve({type:'custom',start:'2026-09-20',end:'2026-09-20'});
    const rows:MonthlyTotal[]=['2026-09-19','2026-09-20','2026-09-21'].map(financial_date=>({financial_date,month:'2026-09',user_id:'u',currency:'MYR',type:'expense',category_id:'a',amount:'0.10',transaction_count:1}));
    expect(analyzePeriod(rows,[],period,'MYR',null,'None')).toMatchObject({expense:'0.10',previousExpense:'0.10',count:1});
    expect(cashPoints(rows,periodMonths(period),'MYR',null,'en',period)[0]).toMatchObject({expenseExact:'0.10',from:'2026-09-20',to:'2026-09-20'});
    expect(dashboardFinancials([],[],period,'MYR',null,'UTC','en','None',{monthly:rows,net:[]}).expenseExact).toBe('0.10');
  });
  it('includes earliest/latest history with no invented all-time comparison', () => {
    const period=resolve({type:'all-time'});
    const rows:MonthlyTotal[]=['1999-01-01','2026-10-15'].map(financial_date=>({financial_date,month:financial_date.slice(0,7),user_id:'u',currency:'MYR',type:'income',category_id:null,amount:'90071992547409.93',transaction_count:1}));
    expect(period).toMatchObject({from:'',to:'',comparison:false});
    expect(analyzePeriod(rows,[],period,'MYR',null,'None')).toMatchObject({income:'180143985094819.86',previousCount:0});
    expect(periodMonths(period,rows.map(r=>r.financial_date!))).toHaveLength(334);
  });
});
describe('category presentation regression',()=>{
  it('preserves edited cyan/purple, duplicate, dark and light colors across ordering and periods',()=>{
    const categories=[{id:'a',color:'#00ffff'},{id:'b',color:'#00ffff'},{id:'white',color:'#ffffff'},{id:'black',color:'#000000'}] as Category[];
    for(const category of categories) expect(categoryColor(category.id,categories)).toBe(category.color);
    const edited=categories.map(c=>c.id==='b'?{...c,color:'#a855f7'}:c);
    expect(categoryColor('b',edited)).toBe('#a855f7');
    expect(categoryColor('b',edited.slice().reverse())).toBe('#a855f7');
    expect(categoryColor('a',edited)).toBe('#00ffff');
    for(const type of ['month','all-time'] as const) {
      const period=type==='month'?resolve({type,month:'2026-09'}):resolve({type});
      const rows:MonthlyTotal[]=[{user_id:'u',month:'2026-09',type:'expense',currency:'MYR',category_id:'b',amount:'0.30',transaction_count:1}];
      expect(analyzePeriod(rows,edited,period,'MYR',null,'None').spending[0].color).toBe('#a855f7');
    }
  });
  it('uses an identity-only fallback unaffected by create/delete/reorder or invalid colors',()=>{
    const fallback=categoryColor('missing',[]);
    expect(categoryColor('missing',[{id:'other',color:fallback}] as Category[])).toBe(fallback);
    expect(categoryColor('missing',[{id:'missing',color:'invalid'}] as Category[])).toBe(fallback);
    expect(categoryColor(null,[])).toMatch(/^#[0-9a-f]{6}$/);
  });
});
describe('user-scoped period fallback',()=>{
  it('isolates users, rejects invalid values and restores defaults',()=>{
    const values=new Map<string,string>();
    vi.stubGlobal('localStorage',{getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>values.set(key,value)});
    cachePeriodPreference('alice','last-6-months');
    expect(readPeriodPreference('alice')).toBe('last-6-months');
    expect(readPeriodPreference('bob')).toBe('month');
    expect(readPeriodPreference(undefined)).toBe('month');
    cachePeriodPreference('alice','month');
    expect(readPeriodPreference('alice')).toBe('month');
    values.set('prism-analysis-period:bob','custom');
    expect(readPeriodPreference('bob')).toBe('month');
  });
});
