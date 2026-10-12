import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';
import { connectedFetch } from './connectivity';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

// Capture only a boolean before the SDK consumes callback parameters. Never
// render provider descriptions or leave error payloads in browser history.
const callbackUrl = typeof window === 'undefined' ? null : new URL(window.location.href);
const callbackHash = new URLSearchParams(callbackUrl?.hash.slice(1));
export const initialAuthLinkError = Boolean(callbackUrl && (callbackUrl.searchParams.has('error') || callbackUrl.searchParams.has('error_code') || callbackHash.has('error') || callbackHash.has('error_code')));
export const initialAuthCallback = Boolean(callbackUrl && !initialAuthLinkError && (callbackUrl.searchParams.has('code') || callbackHash.has('access_token')));
export function clearAuthLinkParameters() {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  for (const key of ['error', 'error_code', 'error_description', 'code', 'access_token', 'refresh_token', 'provider_token', 'provider_refresh_token', 'token', 'token_hash', 'type', 'expires_in', 'expires_at', 'sb_flow_id', 'recovery']) url.searchParams.delete(key);
  url.hash = '';
  url.pathname = '/login';
  window.history.replaceState(null, '', url.pathname + url.search);
}
if (initialAuthLinkError) clearAuthLinkParameters();

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local before starting P.R.I.S.M.');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  global: { fetch: connectedFetch },
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
});
