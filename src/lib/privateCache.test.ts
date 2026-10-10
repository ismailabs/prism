import {QueryClient} from '@tanstack/react-query';
import {expect,it} from 'vitest';
import {clearPrivateQueries} from './privateCache';

it('removes action and finance memory for every owner while retaining public FX',async()=>{
 const client=new QueryClient({defaultOptions:{queries:{retry:false}}});
 for(const key of ['financial_notes','financial_reminders','action_receipts','action_preferences','goal_action_plans','notes-page','timeline-records','action-source'])
  for(const owner of ['a','b'])client.setQueryData(['platform',owner,key],{title:'Private',body:'Private context'});
 client.setQueryData(['finance','a','transactions'],[{amount:'1000.00'}]);
 client.setQueryData(['rates','MYR'],{USD:'0.23'});
 await client.getMutationCache().build(client,{mutationKey:['platform-write','a'],mutationFn:async(values:{title:string;body:string})=>values.title}).execute({title:'Private title',body:'Private body'});
 await client.getMutationCache().build(client,{mutationKey:['finance-write','b'],mutationFn:async(values:{amount:string})=>values.amount}).execute({amount:'1000.00'});
 let aborted=false;
 const pending=client.fetchQuery({queryKey:['platform','a','pending-action'],queryFn:({signal})=>new Promise((_,reject)=>signal.addEventListener('abort',()=>{aborted=true;reject(new Error('aborted'));}))}).catch(()=>undefined);
 clearPrivateQueries(client);await pending;
 expect(aborted).toBe(true);
 expect(client.getQueryCache().getAll().map(q=>q.queryKey)).toEqual([['rates','MYR']]);
 expect(client.getMutationCache().getAll()).toEqual([]);
 client.clear();
});

it('preserves pending financial settlement counts and erases private write variables after settlement',async()=>{
 const client=new QueryClient(),key=['finance-write','a'];
 let finish!:()=>void,started!:()=>void;
 const ready=new Promise<void>(resolve=>{started=resolve;});
 const mutation=client.getMutationCache().build(client,{
  mutationKey:key,
  mutationFn:(values:{amount:string})=>new Promise<string>(resolve=>{finish=()=>resolve(values.amount);started();}),
  onSettled:()=>{expect(client.isMutating({mutationKey:key})).toBe(1);},
 });
 const writing=mutation.execute({amount:'1000.00'});await ready;
 clearPrivateQueries(client);
 expect(client.isMutating({mutationKey:key})).toBe(1);
 finish();await writing;
 expect(client.getMutationCache().getAll()).toEqual([]);
 client.clear();
});
