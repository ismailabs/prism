import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query';
import {useAuth} from './useAuth';
import {supabase} from '@/lib/supabase';
import type {ActionPreferences,ActionReceipt,FinancialNote,FinancialReminder} from '@/types/actions';
type Input<T>=Omit<T,'id'|'user_id'|'created_at'|'updated_at'>;
type Rows={financial_reminders:FinancialReminder;action_receipts:ActionReceipt;action_preferences:ActionPreferences};
function useActionAccess(){const {user,loading,requiresMfa}=useAuth();const id=user?.id,enabled=!!id&&!loading&&!requiresMfa;const verify=()=>{if(!id||!enabled)throw new Error('Verified session required.');return id;};return {id,enabled,verify};}
async function readPages<T>(read:(offset:number)=>PromiseLike<{data:T[]|null;error:unknown}>){const rows:T[]=[];for(let offset=0;;offset+=1000){const {data,error}=await read(offset);if(error)throw error;if(!data)throw new Error('Missing private records.');rows.push(...data);if(data.length<1000)return rows;}}
const readers:{[K in keyof Rows]:(id:string,signal:AbortSignal)=>Promise<Rows[K][]>}={
 financial_reminders:(id,signal)=>readPages(offset=>supabase.from('financial_reminders').select('*').eq('user_id',id).order('id').range(offset,offset+999).abortSignal(signal)),
 action_receipts:(id,signal)=>readPages(offset=>supabase.from('action_receipts').select('*').eq('user_id',id).order('id').range(offset,offset+999).abortSignal(signal)),
 action_preferences:(id,signal)=>readPages(offset=>supabase.from('action_preferences').select('*').eq('user_id',id).order('id').range(offset,offset+999).abortSignal(signal))
};
export function useActionTable<T extends keyof Rows>(table:T){const {id,enabled,verify}=useActionAccess();return useQuery({queryKey:['platform',id,table],enabled,staleTime:20000,queryFn:({signal})=>readers[table](verify(),signal)});}
export function useNotes(query:string,tag:string,page:number,archived:boolean){const {id,enabled,verify}=useActionAccess();return useQuery({queryKey:['platform',id,'notes-page',query,tag,page,archived],enabled,queryFn:async({signal})=>{
 let request=supabase.from('financial_notes').select('*',{count:'exact'}).eq('user_id',verify()).eq('archived',archived).order('pinned',{ascending:false}).order('updated_at',{ascending:false}).order('id').range((page-1)*25,page*25-1).abortSignal(signal);
 if(query.trim())request=request.textSearch('search_document',query.trim(),{type:'plain',config:'simple'});
 if(tag.trim())request=request.contains('tags',[tag.trim().toLocaleLowerCase()]);
 const {data,error,count}=await request;if(error)throw error;if(data===null||count===null)throw new Error('Missing private note page or count.');return {rows:data,total:count};
}});}
export function useNoteMutations(){const {id,verify}=useActionAccess(),client=useQueryClient();const refresh=()=>client.invalidateQueries({queryKey:['platform',id]});return {
 save:useMutation({mutationKey:['platform-write',id],mutationFn:async({noteId,values}:{noteId:string;values:Input<FinancialNote>})=>{const {error}=await supabase.from('financial_notes').upsert({...values,id:noteId,user_id:verify()},{onConflict:'id'}).select('id').single();if(error)throw error;},onSuccess:refresh}),
 update:useMutation({mutationKey:['platform-write',id],mutationFn:async({noteId,values}:{noteId:string;values:Partial<Input<FinancialNote>>})=>{const {error}=await supabase.from('financial_notes').update(values).eq('id',noteId).eq('user_id',verify()).select('id').single();if(error)throw error;},onSuccess:refresh})};}
export const defaultActionPreferences={reminders_enabled:true,debt_enabled:true,recurring_enabled:true,budget_enabled:true,goal_enabled:true};
export function useActionMutations(){const {id,verify}=useActionAccess(),client=useQueryClient();const refresh=()=>client.invalidateQueries({queryKey:['platform',id]});return {
 save:useMutation({mutationKey:['platform-write',id],mutationFn:async({reminderId,values}:{reminderId:string;values:Input<FinancialReminder>})=>{const {error}=await supabase.from('financial_reminders').upsert({...values,id:reminderId,user_id:verify()},{onConflict:'id'}).select('id').single();if(error)throw error;},onSuccess:refresh}),
 update:useMutation({mutationKey:['platform-write',id],mutationFn:async({reminderId,values}:{reminderId:string;values:Partial<Input<FinancialReminder>>})=>{const {error}=await supabase.from('financial_reminders').update(values).eq('id',reminderId).eq('user_id',verify()).select('id').single();if(error)throw error;},onSuccess:refresh}),
 receipt:useMutation({mutationKey:['platform-write',id],mutationFn:async({key,state}:{key:string;state:ActionReceipt['state']})=>{const {error}=await supabase.from('action_receipts').upsert({occurrence_key:key,state,user_id:verify()},{onConflict:'user_id,occurrence_key'});if(error)throw error;},onSuccess:refresh}),
 preferences:useMutation({mutationKey:['platform-write',id],mutationFn:async(values:Input<ActionPreferences>)=>{const {error}=await supabase.from('action_preferences').upsert({...values,user_id:verify()},{onConflict:'user_id'});if(error)throw error;},onSuccess:refresh})};}
