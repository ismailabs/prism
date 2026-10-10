import type { QueryClient } from '@tanstack/react-query';
/** All user-owned query families must be registered here. Public FX cache may remain. */
export function clearPrivateQueries(client:QueryClient){
 const predicate=(query:{queryKey:readonly unknown[]})=>['finance','platform'].includes(String(query.queryKey[0]));
 void client.cancelQueries({predicate});client.removeQueries({predicate});
 // Successful and failed writes also retain variables (including note bodies).
 // Pending entries retain the write counters used by financial settlement.
 // Remove their variables immediately after settlement, without cancel/retry.
 const cache=client.getMutationCache();
 for(const mutation of cache.getAll()){
  if(!['finance-write','platform-write'].includes(String(mutation.options.mutationKey?.[0])))continue;
  if(mutation.state.status!=='pending')cache.remove(mutation);
  else {
   const unsubscribe=cache.subscribe(event=>{
    if(event.mutation!==mutation)return;
    if(event.type==='removed'){unsubscribe();return;}
    if(mutation.state.status!=='pending'){unsubscribe();cache.remove(mutation);}
   });
  }
 }
}
