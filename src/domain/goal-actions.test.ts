import { describe,it,expect } from 'vitest';
import {goalFunding,goalProjection} from './goal-actions';
import type {Objective,ObjectiveContribution,Transfer} from '@/types';
import type {GoalActionPlan} from '@/types/actions';
const goal:Objective={id:'g',user_id:'a',kind:'goal',name:'Emergency',notes:'',category:'Safety',priority:'high',target_amount:'2000.00',currency:'MYR',target_date:null,status:'active',created_at:'',updated_at:''};
const transfer:Transfer={id:'t',user_id:'a',source_account_id:'main',destination_account_id:'savings',source_amount:'1000.00',destination_amount:'1000.00',source_currency:'MYR',destination_currency:'MYR',occurred_at:'2026-01-01T00:00:00Z',note:'',created_at:'',updated_at:''};
const contribution:ObjectiveContribution={id:'c',user_id:'a',objective_id:'g',currency:'MYR',amount:'1000.00',transfer_id:'t',transaction_id:null,note:'',contributed_at:'2026-01-01T00:00:00Z',created_at:''};
describe('source-aware goals',()=>{
 it('counts one exact transfer once, distinguishes notional overlap and excludes future cash',()=>{
  const result=goalFunding(goal,[contribution,{...contribution,id:'duplicate'}, {...contribution,id:'earmark',transfer_id:null,amount:'100.00'}],[],[transfer],Date.parse('2026-02-01'));
  expect(result).toMatchObject({transferred:'1000.00',earmarked:'100.00',funded:'1100.00',remaining:'900.00',percent:55});
  expect(goalFunding(goal,[contribution],[],[{...transfer,occurred_at:'2030-01-01T00:00:00Z'}],Date.parse('2026-02-01')).funded).toBe('0.00');
  expect(goalFunding(goal,[contribution],[],[],Date.parse('2026-02-01')).funded).toBe('0.00');
  expect(goalFunding(goal,[contribution],[],[{...transfer,destination_amount:'800.00'}],Date.parse('2026-02-01')).funded).toBe('800.00');
 });
 it('does not count a movement one microsecond into the present clock millisecond',()=>{
  const now=Date.parse('2026-01-01T00:00:00.000Z');
  expect(goalFunding(goal,[contribution],[],[{...transfer,occurred_at:'2026-01-01T08:00:00.000001+08:00'}],now).funded).toBe('0.00');
  expect(goalFunding(goal,[contribution],[],[{...transfer,occurred_at:'2026-01-01T00:00:00.000000Z'}],now).funded).toBe('1000.00');
 });
 it('uses authoritative old transaction links outside the recent list and supports aggregate funding',()=>{
  const old={...contribution,transfer_id:null,transaction_id:'old-tx',amount:null,effective_amount:'75.00'};
  expect(goalFunding(goal,[old],[],[]).legacy).toBe('75.00');
  expect(goalFunding(goal,[{...old,effective_amount:'0.00'}],[],[]).funded).toBe('0.00');
  const max={...contribution,transfer_id:null,amount:'9999999999999999.99'};
  expect(goalFunding(goal,[max,{...max,id:'c2'}],[],[])).toMatchObject({funded:'19999999999999999.98',completed:true,percent:100});
 });
 it('keeps currencies separate and JPY exact above safe Number range',()=>{
  const jpy={...goal,currency:'JPY' as const,target_amount:'9999999999999999'};
  expect(goalFunding(jpy,[{...contribution,transfer_id:null,currency:'JPY',amount:'9007199254740993'},contribution],[],[]).remaining).toBe('992800745259006');
 });
 it('uses the original month-end cadence, ceiling division and bounded completion',()=>{
  const plan:GoalActionPlan={id:'p',user_id:'a',objective_id:'g',account_id:null,currency:'MYR',cadence_amount:'100.00',frequency:'monthly',start_date:'2026-01-31',created_at:''};
  expect(goalProjection('200.01',plan,'2026-02-01')).toBe('2026-04-30');
  expect(goalProjection('0.00',plan,'2026-02-01')).toBeNull();
  expect(goalProjection('999999.00',plan,'2026-02-01')).toBeNull();
 });
});
