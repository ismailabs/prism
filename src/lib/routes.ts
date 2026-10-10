import type { Tab } from '@/types';

export const privateTabs: readonly Tab[] = ['dashboard', 'transactions', 'analytics', 'accounting', 'accounts', 'plans', 'goals', 'savings', 'debts', 'categories', 'payments', 'settings'];
export function pathTab(path: string): Tab | null {
  const name = path.replace(/^\/+|\/+$/g, '');
  return privateTabs.includes(name as Tab) ? name as Tab : null;
}
/** Only local, implemented finance destinations can survive an Auth redirect. */
export function safeDestination(value: string | null, fallback = '/dashboard'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\') || Array.from(value).some(char => char.charCodeAt(0) < 32)) return fallback;
  const url = new URL(value, 'https://prism.invalid');
  if (url.origin !== 'https://prism.invalid' || !pathTab(url.pathname)) return fallback;
  // Auth credentials and fragments must never enter return links or history.
  for (const key of ['code', 'recovery', 'access_token', 'refresh_token']) url.searchParams.delete(key);
  return url.pathname + url.search;
}
export function loginPath(destination: string, signup = false): string {
  const params = new URLSearchParams({ next: safeDestination(destination) });
  if (signup) params.set('mode', 'signup');
  return `/login?${params}`;
}
export function authCallback(): string {
  const params = new URLSearchParams(window.location.search);
  return window.location.origin + loginPath(params.get('next') ?? '/dashboard');
}
export function navigatePath(path: string, replace = false) {
  window.history[replace ? 'replaceState' : 'pushState'](null, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}
