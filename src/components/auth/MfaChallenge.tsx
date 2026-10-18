import { errorMessage } from '@/lib/utils';
import { useEffect, useState, type FormEvent } from 'react';
import { LoaderCircle, ShieldCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useAuthCopy } from './copy';

interface AuthenticatorOption { id: string; friendlyName: string }

export function MfaChallenge({ onVerified }: { onVerified?: () => void } = {}) {
  const { user, refreshMfa, signOut, authError, securityStatus } = useAuth();
  const copy = useAuthCopy();
  const [factors, setFactors] = useState<AuthenticatorOption[]>([]);
  const [factorId, setFactorId] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState('');
  const [backupConfirmed, setBackupConfirmed] = useState(false);
  const needsApproval = Boolean(factorId && !securityStatus?.approvedFactorIds.includes(factorId));

  useEffect(() => {
    let active = true;
    void supabase.auth.mfa.listFactors().then(({ data, error: factorError }) => {
      if (!active) return;
      if (factorError) setError(errorMessage(factorError));
      else {
        const verified = data.totp.filter(factor => factor.status === 'verified').map((factor, index) => ({ id: factor.id, friendlyName: factor.friendly_name || `${copy.authenticator} ${index + 1}` }));
        setFactors(verified); setFactorId(verified.find(factor => securityStatus?.approvedFactorIds.includes(factor.id))?.id ?? verified[0]?.id ?? '');
      }
      setInitializing(false);
    }).catch((cause: unknown) => { if (active) { setError(errorMessage(cause)); setInitializing(false); } });
    return () => { active = false; };
  }, [user?.id, copy.authenticator, copy.failed, securityStatus?.approvedFactorIds]);

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('');
    if (!/^\d{6}$/.test(code)) { setError(copy.tokenError); return; }
    if (!factorId) { setError(copy.noFactor); return; }
    if (needsApproval && !backupConfirmed) { setError(copy.backupConfirm); return; }
    setBusy(true);
    try {
      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
      if (verifyError) throw verifyError;
      if (needsApproval) {
        const { error: approvalError } = await supabase.rpc('approve_mfa_factor', { p_factor_id: factorId, p_separate_backup: backupConfirmed });
        if (approvalError) throw approvalError;
      }
      await refreshMfa();
      onVerified?.();
    } catch (cause) { setError(errorMessage(cause)); await refreshMfa().catch(() => {}); }
    finally { setBusy(false); }
  }

  return <section className="card mx-auto w-full max-w-md space-y-5 p-7" aria-labelledby="mfa-challenge-title">
    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><ShieldCheck size={25} /></span>
    <div className="space-y-2"><h2 id="mfa-challenge-title" className="text-2xl font-semibold tracking-tight">{copy.verifyTitle}</h2><p className="text-sm leading-relaxed text-muted-foreground">{copy.verifySubtitle}</p></div>
    {initializing ? <p role="status" className="text-sm text-muted-foreground">{copy.loading}</p> : factors.length === 0 ? <div className="space-y-3"><p className="text-sm">{copy.noFactor}</p><button className="btn-secondary" onClick={() => void refreshMfa().catch((cause: unknown) => setError(errorMessage(cause)))}>{copy.retry}</button></div> : <form onSubmit={event => void verify(event)} className="space-y-4">
      {factors.length > 1 && <label className="form-field flex flex-col gap-2 text-sm" htmlFor="mfa-factor">{copy.authenticator}<select className="input" id="mfa-factor" value={factorId} onChange={event => setFactorId(event.target.value)}>{factors.map(factor => <option value={factor.id} key={factor.id}>{factor.friendlyName}</option>)}</select></label>}
      <label className="form-field flex flex-col gap-2 text-sm" htmlFor="mfa-code">{copy.code}<input id="mfa-code" autoFocus className="input text-center text-2xl tracking-[0.5em]" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" placeholder="000000" value={code} onChange={event => setCode(event.target.value.replace(/\D/g, ''))} disabled={busy} required /></label>
      {needsApproval && <label className="flex items-start gap-3 text-sm leading-relaxed"><input type="checkbox" className="mt-1 h-4 w-4 shrink-0" checked={backupConfirmed} onChange={event => setBackupConfirmed(event.target.checked)} disabled={busy} required /><span>{copy.backupConfirm}</span></label>}
      <button type="submit" className="btn-primary flex w-full items-center justify-center gap-2" disabled={busy || code.length !== 6 || (needsApproval && !backupConfirmed)}>{busy && <LoaderCircle size={17} className="animate-spin" />}{copy.verify}</button>
    </form>}
    {(error || authError) && <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">{error || authError}</p>}
    <button type="button" className="btn-secondary w-full" disabled={busy} onClick={() => void signOut().catch((cause: unknown) => setError(errorMessage(cause)))}>{copy.signOut}</button>
  </section>;
}
