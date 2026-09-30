import type { QueryClient } from '@tanstack/react-query';
/** All user-owned query families must be registered here. Public FX cache may remain. */
export function clearPrivateQueries(client:QueryClient){const predicate=(query:{queryKey:readonly unknown[]})=>['finance','platform'].includes(String(query.queryKey[0]));void client.cancelQueries({predicate});client.removeQueries({predicate});}
