import {useEffect,useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {useAuth} from './useAuth';
import {usePlatformTable} from './usePlatformData';
import {usePlanningData} from './usePlanningData';
import {useGoalActions} from './useGoalActions';
import {useActionTable,defaultActionPreferences} from './useActionData';
import {supabase} from '@/lib/supabase';
import {timelineBounds,type ActionSources} from '@/domain/actions';
import {transactionTransport} from '@/domain/transport';
import {useAppStore} from '@/store/useAppStore';
import type {Transaction} from '@/types';
import type {FinancialNote} from '@/types/actions';
export function useActionClock(){const [now,setNow]=useState(Date.now);useEffect(()=>{const update=()=>setNow(Date.now());const timer=window.setInterval(update,60000);document.addEventListener('visibilitychange',update);return()=>{window.clearInterval(timer);document.removeEventListener('visibilitychange',update);};},[]);return now;}
export function useActionTimeline(month:string,calendar=true){
 const {user,loading,requiresMfa}=useAuth(),timezone=useAppStore(s=>s.financialTimezone),id=user?.id,enabled=!!id&&!loading&&!requiresMfa;
 const goals=usePlatformTable('objectives'),contributions=usePlatformTable('objective_contributions'),transfers=usePlatformTable('transfers'),debts=usePlatformTable('person_debts'),repayments=usePlatformTable('debt_repayments'),planning=usePlanningData(),plans=useGoalActions().plans;
 const reminders=useActionTable('financial_reminders'),receipts=useActionTable('action_receipts'),preferences=useActionTable('action_preferences');
 const records=useQuery({queryKey:['platform',id,'timeline-records',month,timezone],enabled:enabled&&calendar,queryFn:async({signal})=>{
  if(!id)throw new Error('Verified session required.');const {lower,upper}=timelineBounds(month);
  const transactions:Transaction[]=[],notes:FinancialNote[]=[];
  await Promise.all([
   (async()=>{for(let offset=0;;offset+=1000){const {data,error}=await supabase.from('exact_transactions').select('*').eq('user_id',id).gte('transaction_date',lower).lt('transaction_date',upper).order('transaction_date').order('id').range(offset,offset+999).abortSignal(signal);if(error)throw error;transactions.push(...data.map(row=>transactionTransport.parse(row)));if(data.length<1000)break;}})(),
   (async()=>{for(let offset=0;;offset+=1000){const {data,error}=await supabase.from('financial_notes').select('*').eq('user_id',id).eq('archived',false).gte('updated_at',lower).lt('updated_at',upper).order('updated_at').order('id').range(offset,offset+999).abortSignal(signal);if(error)throw error;notes.push(...data);if(data.length<1000)break;}})()
  ]);return {transactions,notes};
 }});
 const queries=[goals,contributions,transfers,debts,repayments,planning.budgets,planning.rules,plans,reminders,receipts,preferences,...(calendar?[records]:[])];
 const sources:ActionSources={goals:goals.data??[],contributions:contributions.data??[],transfers:transfers.data??[],plans:plans.data??[],debts:debts.data??[],repayments:repayments.data??[],rules:planning.rules.data??[],budgets:planning.budgets.data??[],reminders:reminders.data??[],receipts:receipts.data??[],preferences:preferences.data?.[0]??defaultActionPreferences,transactions:records.data?.transactions??[],notes:records.data?.notes??[]};
 return {sources,timezone,error:queries.find(q=>q.error)?.error,pending:queries.some(q=>q.isPending),refresh:()=>Promise.all(queries.map(q=>q.refetch()))};
}
