import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { errorMessage } from '@/lib/utils';
import { useAuthCopy } from './copy';
import { MailboxVerification } from './MailboxVerification';
import { MfaChallenge } from './MfaChallenge';
import { MfaSetup } from './MfaSetup';

export function MfaGate() {
  const { user, securityStatus, authError, refreshMfa, signOut } = useAuth();
  const copy = useAuthCopy();
  const [factorCount, setFactorCount] = useState<number | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    void supabase.auth.mfa.listFactors().then(({ data, error: cause }) => {
      if (!active) return;
      if (cause) setError(errorMessage(cause));
      else setFactorCount(data.all.filter(factor => factor.status === 'verified' && factor.factor_type === 'totp').length);
    }).catch(cause => { if (active) setError(errorMessage(cause)); });
    return () => { active = false; };
  }, [user?.id, securityStatus]);
  const expired = securityStatus?.reason === 'session_expired' || securityStatus?.reason === 'session_invalid';
  const allLost = securityStatus?.activated && factorCount === 0;
  const approvedCount = securityStatus?.approvedFactorIds.length ?? 0;
  const needsMail = !securityStatus?.mailboxVerified && (approvedCount < 2 || securityStatus?.reason === 'needs_backup' || securityStatus?.reason === 'needs_approval');
  if (authError || error || !securityStatus || expired || allLost) return <section className="card mx-auto w-full max-w-lg space-y-4 p-7" aria-labelledby="security-gate-title">
    <h1 id="security-gate-title" className="text-2xl font-semibold">{allLost ? copy.recoveryBlockedTitle : copy.sessionCheckTitle}</h1>
    <p className="text-sm leading-relaxed">{allLost ? copy.recoveryBlockedDetail : expired ? copy.sessionExpired : copy.sessionCheckDetail}</p>
    {(authError || error) && <p role="alert" className="break-words text-sm text-red-600 dark:text-red-400">{authError || error}</p>}
    {!allLost && !expired && <button type="button" className="btn-secondary" onClick={() => void refreshMfa().catch(cause => setError(errorMessage(cause)))}>{copy.retry}</button>}
    <button type="button" className="btn-secondary w-full" onClick={() => void signOut().catch(cause => setError(errorMessage(cause)))}>{copy.signOut}</button>
  </section>;
  if (factorCount === null) return <p role="status">{copy.loading}</p>;
  return <div className="mx-auto w-full max-w-lg space-y-5">
    <section className="card space-y-3 p-6"><h1 className="text-2xl font-semibold">{copy.requiredTitle}</h1><p className="text-sm leading-relaxed text-muted-foreground">{copy.requiredDetail}</p><p className="text-sm font-medium">{copy.approvedProgress.replace('{count}', String(approvedCount))}</p></section>
    {needsMail ? <section className="card p-6"><MailboxVerification /></section> : factorCount === 0 || securityStatus.reason === 'needs_backup' ? <MfaSetup inline /> : <MfaChallenge />}
    <p className="px-2 text-sm leading-relaxed text-muted-foreground">{copy.backupWarning}</p>
  </div>;
}
