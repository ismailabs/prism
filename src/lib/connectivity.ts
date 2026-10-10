import { useSyncExternalStore } from 'react';
const subscribe = (notify: () => void) => {
  window.addEventListener('online', notify); window.addEventListener('offline', notify);
  return () => { window.removeEventListener('online', notify); window.removeEventListener('offline', notify); };
};
export const isOnline = () => typeof navigator === 'undefined' || navigator.onLine;
export const useOnline = () => useSyncExternalStore(subscribe, isOnline, () => true);
/** Never queue a financial write or retry it automatically after reconnect. */
export async function connectedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (!isOnline()) throw new Error('PRISM_OFFLINE');
  return fetch(input, { ...init, cache: 'no-store' });
}
export const queryDefaults = { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: true }, mutations: { retry: false as const, networkMode: 'always' as const } };
