import {describe,it,expect} from 'vitest';
import {financialTimeline,notificationCandidates,reminderOccurrences,rangedOccurrences,monthRange,timelineBounds,type ActionSources} from './actions';
import {emptyActionLink,linkFields,parseTags} from './action-links';
import type {FinancialReminder} from '@/types/actions';
const reminder:FinancialReminder={...emptyActionLink,id:'r',user_id:'a',title:'Review fund',due_local:'2026-12-31T23:30:00',timezone:'Asia/Kuala_Lumpur',frequency:'once',interval:1,importance:'high',state:'open',archived:false,created_at:'',updated_at:''};
const sources:ActionSources={transactions:[],reminders:[reminder],notes:[],receipts:[],preferences:{reminders_enabled:true,debt_enabled:true,recurring_enabled:true,goal_enabled:true,budget_enabled:true},goals:[],contributions:[],transfers:[],plans:[],debts:[],repayments:[],rules:[],budgets:[]};
describe('action derivation',()=>{
 it('uses the user timezone across year boundaries, and reminder timezone for the exact instant',()=>{
  const now=Date.parse('2026-12-31T16:00:00Z');
  const a=financialTimeline(sources,'2026-12-01','2027-01-31','Asia/Kuala_Lumpur',now);
  expect(a[0]).toMatchObject({date:'2026-12-31',status:'Overdue'});
  const tokyo={...reminder,due_local:'2027-01-01T00:30:00',timezone:'Asia/Tokyo'};
  expect(financialTimeline({...sources,reminders:[tokyo]},'2026-12-01','2026-12-31','America/Los_Angeles',now)[0]).toMatchObject({date:'2026-12-31',status:'Overdue'});
  expect(financialTimeline({...sources,reminders:[{...reminder,due_local:'2027-01-02T00:01:00'}]},'2027-01-01','2027-01-31','Asia/Kuala_Lumpur',now)[0].status).toBe('Upcoming');
 });
 it('is deterministic, occurrence-scoped and supersedes stale due/timezone identities',()=>{
  const now=Date.parse('2027-01-01T00:00Z'),before=structuredClone(sources);
  const once=notificationCandidates(sources,'Asia/Kuala_Lumpur',now);
  expect(notificationCandidates(sources,'Asia/Kuala_Lumpur',now)).toEqual(once);expect(sources).toEqual(before);
  expect(notificationCandidates({...sources,receipts:[{id:'receipt',user_id:'a',occurrence_key:once[0].key,state:'dismissed',created_at:'',updated_at:''}]},'Asia/Kuala_Lumpur',now)).toHaveLength(0);
  const updated=notificationCandidates({...sources,reminders:[{...reminder,due_local:'2027-01-02T23:30:00',timezone:'UTC'}]},'Asia/Kuala_Lumpur',now);
  expect(updated[0].key).not.toBe(once[0].key);
  expect(notificationCandidates({...sources,preferences:{...sources.preferences,reminders_enabled:false}},'Asia/Kuala_Lumpur',now)).toHaveLength(0);
 });
 it('does not shift DST gaps or folds and retains a visible review state',()=>{
  const fold={...reminder,due_local:'2026-10-25T01:30:00',timezone:'America/New_York',frequency:'weekly' as const};
  expect(reminderOccurrences(fold,'2026-11-01','2026-11-01')[0].instant).toBeNull();
  expect(financialTimeline({...sources,reminders:[fold]},'2026-11-01','2026-11-01','America/New_York',Date.parse('2026-11-01T12:00Z'))[0]).toMatchObject({status:'Estimated',issue:'dst',notify:false});
 });
 it('retains month-end anchors and finds old reminders without unbounded iteration',()=>{
  expect(rangedOccurrences({start:'1900-01-01',frequency:'daily',interval:1},'2026-10-01','2026-10-31')).toHaveLength(31);
  expect(rangedOccurrences({start:'2026-01-31',frequency:'monthly',interval:1},'2026-02-01','2026-03-31').map(r=>r.date)).toEqual(['2026-02-28','2026-03-31']);
  expect(notificationCandidates({...sources,reminders:[{...reminder,due_local:'2020-01-01T12:00:00'}]},'UTC',Date.parse('2026-10-10T00:00Z'))[0].status).toBe('Overdue');
  expect(notificationCandidates({...sources,reminders:[{...reminder,due_local:'2020-01-01T00:30:00',timezone:'Asia/Tokyo'}]},'America/Los_Angeles',Date.parse('2026-10-10T00:00Z'))[0]).toMatchObject({date:'2019-12-31',status:'Overdue'});
  expect(monthRange('2028-02').to).toBe('2028-02-29');
 });
 it('keeps recurring salary/bills anticipated and receipts never mutate financial sources',()=>{
  const input={...sources,reminders:[],rules:[{id:'rule',user_id:'a',description:'Salary expected',currency:'MYR' as const,amount:'5000.00',type:'income' as const,account_id:null,category_id:null,payment_method_id:null,start_date:'2026-10-31',end_date:null,frequency:'monthly' as const,interval:1,next_index:0,active:true,created_at:''}]};
  const before=structuredClone(input),result=financialTimeline(input,'2026-10-01','2026-10-31','Asia/Kuala_Lumpur',Date.parse('2026-10-10'));
  expect(result[0]).toMatchObject({status:'Estimated',source:'recurring',amount:'5000.00'});
  expect(financialTimeline({...input,receipts:[{id:'r',user_id:'a',occurrence_key:result[0].key,state:'complete',created_at:'',updated_at:''}]},'2026-10-01','2026-10-31','Asia/Kuala_Lumpur',Date.parse('2026-10-10'))[0].status).toBe('Done');expect(input).toEqual(before);
 });
 it('shows every goal cadence and target separately; completed cash records keep Posted status',()=>{
  const goal={id:'g',user_id:'a',kind:'goal' as const,name:'Reserve',notes:'',category:'Safety',priority:'high' as const,target_amount:'2000.00',currency:'MYR' as const,target_date:'2026-10-31',status:'active' as const,created_at:'',updated_at:''};
  const plan={id:'p',user_id:'a',objective_id:'g',currency:'MYR' as const,account_id:null,cadence_amount:'100.00',frequency:'weekly' as const,start_date:'2026-10-03',created_at:''};
  const tx={id:'tx',user_id:'a',amount:'12.00',currency:'MYR' as const,type:'expense' as const,category_id:null,payment_method_id:null,description:'Posted',transaction_date:'2026-10-01T00:00Z',created_at:''};
  const result=financialTimeline({...sources,reminders:[],goals:[goal],plans:[plan],transactions:[tx],receipts:[{id:'x',user_id:'a',occurrence_key:'transaction:tx',state:'complete',created_at:'',updated_at:''}]},'2026-10-01','2026-10-31','UTC',Date.parse('2026-10-10'));
  expect(result.filter(i=>i.goalEvent==='pace')).toHaveLength(5);
  expect(result.filter(i=>i.goalEvent==='target')).toHaveLength(1);
  expect(result.find(i=>i.source==='transaction')?.status).toBe('Posted');
  expect(financialTimeline({...sources,reminders:[{...reminder,due_local:'1900-01-01T12:00:00',timezone:'UTC'}]},'1900-01-01','1900-01-31','UTC')[0].date).toBe('1900-01-01');
 });
 it('queries a safe month envelope even when local midnight does not exist',()=>{
  const bounds=timelineBounds('2014-08');
  const tx={id:'t',user_id:'a',amount:'1.00',currency:'MYR' as const,type:'expense' as const,category_id:null,payment_method_id:null,description:'Cairo record',transaction_date:'2014-07-31T22:30:00Z',created_at:''};
  expect(tx.transaction_date>=bounds.lower&&tx.transaction_date<bounds.upper).toBe(true);
  expect(financialTimeline({...sources,reminders:[],transactions:[tx]},'2014-08-01','2014-08-31','Africa/Cairo',Date.parse('2014-08-02'))[0]).toMatchObject({date:'2014-08-01',status:'Posted'});
 });
 it('keeps a transaction one microsecond after now Estimated',()=>{
  const tx={id:'t',user_id:'a',amount:'1.00',currency:'MYR' as const,type:'income' as const,category_id:null,payment_method_id:null,description:'Future by one microsecond',transaction_date:'2026-10-10T08:00:00.000001+08:00',created_at:''};
  expect(financialTimeline({...sources,reminders:[],transactions:[tx]},'2026-10-01','2026-10-31','UTC',Date.parse('2026-10-10T00:00:00.000Z'))[0].status).toBe('Estimated');
 });
 it('uses typed links and plain tags',()=>{expect(linkFields('goal','g')).toEqual({...emptyActionLink,objective_id:'g',reminder_id:null});expect(parseTags('Family, family, buffer')).toEqual(['family','buffer']);expect(()=>parseTags('<script>')).toThrow();});
});
