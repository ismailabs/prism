import { clearPrivateQueries } from '@/lib/privateCache';
import type { Session,User } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { createContext,useCallback,useContext,useEffect,useMemo,useRef,useState,type ReactNode } from 'react';
import { clearAuthLinkParameters, initialAuthCallback, initialAuthLinkError, supabase } from '../lib/supabase';
import { errorMessage } from '@/lib/utils';

export interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  requiresMfa: boolean;
  authError: string | null;
  authLinkError?: boolean;
  recovery?: boolean;
  completeRecovery: () => void;
  refreshMfa: () => Promise<void>;
  signOut: () => Promise<void>;
}
interface AuthProviderProps { children: ReactNode }
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: AuthProviderProps) {
  const queryClient = useQueryClient();
  const sessionToken=useRef<string|undefined>(undefined);
  const activeUserId = useRef<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [recovery,setRecovery] = useState(false);
  const completeRecovery=useCallback(()=>{setRecovery(false);window.history.replaceState(null,'',window.location.pathname);},[]);
  const [loading, setLoading] = useState(true);
  const [requiresMfa, setRequiresMfa] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLinkError, setAuthLinkError] = useState(initialAuthLinkError);
  const revision = useRef(0);
  const mounted = useRef(true);

  const resolveSession = useCallback(async (nextSession: Session | null, expectedRevision: number) => {
    if (!nextSession) {
      if (mounted.current && expectedRevision === revision.current) {
        setSession(null); setRequiresMfa(false); setLoading(false); setAuthError(null);
      }
      return;
    }
    try {
      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (error) throw error;
      if (mounted.current && expectedRevision === revision.current) {
        setSession(nextSession);
        setRequiresMfa(data.nextLevel === 'aal2' && data.currentLevel !== 'aal2');
        setAuthError(null);
      }
    } catch (error) {
      if (mounted.current && expectedRevision === revision.current) {
        setSession(nextSession); setRequiresMfa(true);
        setAuthError(errorMessage(error));
      }
    } finally {
      if (mounted.current && expectedRevision === revision.current) setLoading(false);
    }
  }, []);

  const refreshMfa = useCallback(async () => {
    const expectedRevision = ++revision.current;
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    await resolveSession(data.session, expectedRevision);
  }, [resolveSession]);

  useEffect(() => {
    mounted.current = true;
    let disposed = false;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    // The SDK removes a successfully exchanged code. It can ignore a PKCE link
    // from another browser (missing verifier), or return an expired-code error.
    // Wait for initialization, preserve any existing session, and expose only
    // safe localized feedback while removing failed credentials from history.
    if (initialAuthCallback) {
      const invalidLink = () => {
        if (disposed) return;
        clearAuthLinkParameters();
        setAuthLinkError(true);
      };
      void supabase.auth.initialize().then(({ error }) => {
        const url = new URL(window.location.href);
        if (error || url.searchParams.has('code') || new URLSearchParams(url.hash.slice(1)).has('access_token')) invalidLink();
      }).catch(invalidLink);
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY') setAuthLinkError(false);
      if(event==='PASSWORD_RECOVERY')setRecovery(true);
      const nextUserId = nextSession?.user.id ?? null;
      if (activeUserId.current !== nextUserId || (nextSession?.access_token && nextSession.access_token !== sessionToken.current)) {
        // Cancel reads before removing private caches on account changes.
        clearPrivateQueries(queryClient);
        activeUserId.current = nextUserId;
      }
      sessionToken.current=nextSession?.access_token;
      const expectedRevision = ++revision.current;
      setSession(nextSession);
      setLoading(Boolean(nextSession));
      if (!nextSession) { setRequiresMfa(false); setAuthError(null); }
      // Supabase holds an Auth lock while notifying subscribers. Defer Auth
      // calls to a new task so this callback cannot deadlock token refresh.
      const timer = setTimeout(() => {
        timers.delete(timer);
        void resolveSession(nextSession, expectedRevision);
      }, 0);
      timers.add(timer);
    });
    return () => {
      disposed = true;
      mounted.current = false; revision.current += 1;
      subscription.unsubscribe(); timers.forEach(clearTimeout);
    };
  }, [resolveSession, queryClient]);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const value = useMemo<AuthContextValue>(() => ({ user: session?.user ?? null, session, loading, requiresMfa, authError, authLinkError, recovery, completeRecovery, refreshMfa, signOut }), [session, loading, requiresMfa, authError, authLinkError, recovery, completeRecovery, refreshMfa, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider.');
  return context;
}
