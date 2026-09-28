import { describe, expect, it } from 'vitest';
import { accountBalance, debtProgress, objectiveProgress } from './progress';
import type { Account, DebtRepayment, Objective, ObjectiveContribution, PersonDebt, Transaction } from '@/types';

const transaction = (id:string, amount:string, type:'income'|'expense'='expense'):Transaction => ({id,user_id:'u',amount,currency:'MYR',type,category_id:null,payment_method_id:null,account_id:'a',description:'',transaction_date:'2026-09-28',created_at:'2026-09-28'});
const objective:Objective = {id:'g',user_id:'u',kind:'goal',name:'Goal',notes:'',category:'General',priority:'normal',target_amount:'100.00',currency:'MYR',target_date:null,status:'active',created_at:'',updated_at:''};
const contribution = (id:string, amount:string|null, transaction_id:string|null):ObjectiveContribution => ({id,user_id:'u',objective_id:'g',currency:'MYR',amount,transaction_id,note:'',contributed_at:'',created_at:''});
const debt = (direction:PersonDebt['direction']):PersonDebt => ({id:'d',user_id:'u',direction,counterparty:'Pat',original_amount:'100.00',currency:'MYR',due_date:null,notes:'',created_at:'',updated_at:''});
const repayment = (amount:string|null, transaction_id:string|null):DebtRepayment => ({id:'r',user_id:'u',debt_id:'d',currency:'MYR',amount,transaction_id,note:'',paid_at:'',created_at:''});

describe('real financial progress',()=>{
  it('derives goal and savings funding from manual and linked amounts, including edits and deletion',()=>{
    const entries=[contribution('1','25.00',null),contribution('2',null,'t')];
    expect(objectiveProgress(objective,entries,[transaction('t','50.00')])).toMatchObject({funded:'75.00',remaining:'25.00',percent:75,completed:false});
    expect(objectiveProgress({...objective,kind:'savings'},entries,[transaction('t','75.00')])).toMatchObject({funded:'100.00',remaining:'0.00',percent:100,completed:true});
    expect(objectiveProgress(objective,entries,[]).funded).toBe('25.00');
  });
  it.each(['i_owe','owed_to_me'] as const)('derives partial and complete %s repayment',direction=>{
    expect(debtProgress(debt(direction),[repayment('40.00',null)],[])).toMatchObject({paid:'40.00',remaining:'60.00',percent:40,settled:false});
    expect(debtProgress(debt(direction),[repayment(null,'t')],[transaction('t','100.00',direction==='i_owe'?'expense':'income')])).toMatchObject({paid:'100.00',remaining:'0.00',settled:true});
  });
  it('keeps account balances in native exact currency',()=>{
    const account:Account={id:'a',user_id:'u',name:'Wallet',currency:'MYR',opening_balance:'100.00',archived:false,created_at:''};
    expect(accountBalance(account,[transaction('1','0.10'),transaction('2','0.20','income')])).toBe('100.10');
  });
});
