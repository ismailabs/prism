import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import type { GoalActionPlan } from '@/types/actions';
export function useGoalActions() {
  const {user,loading,requiresMfa}=useAuth(), client=useQueryClient();
  const id=user?.id, enabled=!!id&&!loading&&!requiresMfa;
  const verify=()=>{if(!id||!enabled)throw new Error('Verified session required.');return id;};
  const refresh=()=>client.invalidateQueries({queryKey:['platform',id]});
  const plans=useQuery({queryKey:['platform',id,'goal_action_plans'],enabled,queryFn:async({signal})=>{
    const rows:GoalActionPlan[]=[];
    for(let offset=0;;offset+=1000){const {data,error}=await supabase.from('exact_goal_action_plans').select('*').eq('user_id',verify()).order('id').range(offset,offset+999).abortSignal(signal);if(error)throw error;rows.push(...data);if(data.length<1000)return rows;}
  }});
  const save=useMutation({mutationKey:['platform-write',id],mutationFn:async(input:Omit<GoalActionPlan,'id'|'user_id'|'created_at'>)=>{const {error}=await supabase.from('goal_action_plans').upsert({...input,user_id:verify()},{onConflict:'user_id,objective_id'});if(error)throw error;},onSuccess:refresh});
  const remove=useMutation({mutationKey:['platform-write',id],mutationFn:async(planId:string)=>{const {error}=await supabase.from('goal_action_plans').delete().eq('user_id',verify()).eq('id',planId).select('id').single();if(error)throw error;},onSuccess:refresh});
  const contribute=useMutation({mutationKey:['platform-write',id],mutationFn:async(input:{id:string;objective:string;currency:string;amount:string;transfer:string|null;account:string|null;note:string;at:string})=>{verify();const {error}=await supabase.rpc('record_goal_contribution',{p_id:input.id,p_objective:input.objective,p_currency:input.currency,p_amount:input.amount,p_transfer:input.transfer,p_account:input.account,p_note:input.note,p_at:input.at});if(error)throw error;},onSuccess:refresh});
  return {plans,save,remove,contribute};
}
