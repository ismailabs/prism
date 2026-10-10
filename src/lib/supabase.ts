import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';
import { connectedFetch } from './connectivity';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local before starting P.R.I.S.M.');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  global: { fetch: connectedFetch },
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
});
