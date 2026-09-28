import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Check, LoaderCircle, Plus, ShieldCheck, Smartphone, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useAuthCopy } from './copy';

interface EnrolledFactor { id: string; name: string }
interface PendingEnrollment { id: string; qrCode: string; secret: string }

export function MfaSetup() {
  const { user, refreshMfa } = useAuth();
  const queryClient = useQueryClient();
  const copy = useAuthCopy();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [factors, setFactors] = useState<EnrolledFactor[]>([]);
  const [pending, setPending] = useState<PendingEnrollment | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (open && !dialogRef.current?.open) dialogRef.current?.showModal();
    if (!open && dialogRef.current?.open) dialogRef.current?.close();
  }, [open]);

  async function loadFactors() {
    const { data, error: factorError } = await supabase.auth.mfa.listFactors();
    if (factorError) throw factorError;
    setFactors(data.totp.filter(factor => factor.status === 'verified').map((factor, index) => ({ id: factor.id, name: factor.friendly_name || `${copy.authenticator} ${index + 1}` })));
  }

  async function start() {
    setOpen(true); setError(''); setNotice(''); setBusy(true);
    try { await loadFactors(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : copy.failed); }
    finally { setBusy(false); }
  }

  async function enroll() {
    setBusy(true); setError(''); setNotice(''); setCode('');
    try {
      const existing = await supabase.auth.mfa.listFactors();
      if (existing.error) throw existing.error;
      // Interrupted enrollments never count as protection. Remove this app's
      // abandoned factors before creating another to avoid Auth's factor limit.
      for (const factor of existing.data.all.filter(item => item.factor_type === 'totp' && item.status === 'unverified' && item.friendly_name?.startsWith('P.R.I.S.M. '))) {
        const { error: cleanupError } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
        if (cleanupError) throw cleanupError;
      }
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: `P.R.I.S.M. ${crypto.randomUUID().slice(0, 6)}`, issuer: 'P.R.I.S.M.' });
      if (enrollError) throw enrollError;
      const qrCode = data.totp.qr_code.startsWith('data:image/') ? data.totp.qr_code : `data:image/svg+xml;charset=utf-8,${encodeURIComponent(data.totp.qr_code)}`;
      setPending({ id: data.id, qrCode, secret: data.totp.secret });
    } catch (cause) { setError(cause instanceof Error ? cause.message : copy.failed); }
    finally { setBusy(false); }
  }

  async function finish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('');
    if (!pending || !/^\d{6}$/.test(code)) { setError(copy.tokenError); return; }
    setBusy(true);
    try {
      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId: pending.id, code });
      if (verifyError) throw verifyError;
      setPending(null); setCode(''); setNotice(copy.enabled);
      await refreshMfa(); await loadFactors();
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
    } catch (cause) { setError(cause instanceof Error ? cause.message : copy.failed); }
    finally { setBusy(false); }
  }

  async function removeFactor() {
    if (!removing) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const { error: removeError } = await supabase.auth.mfa.unenroll({ factorId: removing });
      if (removeError) throw removeError;
      setRemoving(null); setNotice(copy.removed);
      await supabase.auth.refreshSession();
      await refreshMfa(); await loadFactors();
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
    } catch (cause) { setError(cause instanceof Error ? cause.message : copy.failed); }
    finally { setBusy(false); }
  }

  async function close() {
    if (busy) return;
    if (pending) {
      setBusy(true); setError('');
      try {
        const { error: cleanupError } = await supabase.auth.mfa.unenroll({ factorId: pending.id });
        if (cleanupError) throw cleanupError;
        setPending(null); setCode('');
      } catch (cause) { setError(cause instanceof Error ? cause.message : copy.failed); setBusy(false); return; }
      setBusy(false);
    }
    setRemoving(null); setOpen(false);
  }

  return <>
    <button type="button" className="btn-secondary inline-flex items-center gap-2" disabled={!user} onClick={() => void start()}><ShieldCheck size={17} />{copy.manage}</button>
    <dialog ref={dialogRef} className="mfa-dialog card m-auto max-h-[90dvh] max-w-lg overflow-y-auto rounded-3xl border border-border bg-background p-4 sm:p-7 text-foreground shadow-2xl backdrop:bg-black/60" aria-labelledby="mfa-setup-title" onCancel={event => { event.preventDefault(); void close(); }}>
      <div className="mb-5 flex items-start justify-between gap-4"><div><h2 id="mfa-setup-title" className="text-xl font-semibold">{copy.securityTitle}</h2><p className="mt-2 text-sm text-muted-foreground">{copy.securitySubtitle}</p></div><button type="button" className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted" onClick={() => void close()} disabled={busy} aria-label={copy.close}><X size={20} /></button></div>
      {pending ? <form className="space-y-4" onSubmit={event => void finish(event)}>
        <p className="text-sm leading-relaxed text-muted-foreground">{copy.scan}</p>
        <div className="mx-auto w-fit rounded-2xl bg-white p-3"><img src={pending.qrCode} alt={copy.qrAlt} width={200} height={200} /></div>
        <div className="space-y-2 text-xs"><p className="text-muted-foreground">{copy.manual}</p><code className="block break-all rounded-lg bg-muted p-3 font-mono text-sm select-all">{pending.secret}</code><p className="text-muted-foreground">{copy.secretWarning}</p></div>
        <label className="form-field flex flex-col gap-2 text-sm" htmlFor="mfa-setup-code">{copy.code}<input id="mfa-setup-code" className="input text-center text-xl tracking-[0.4em]" inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" value={code} onChange={event => setCode(event.target.value.replace(/\D/g, ''))} placeholder="000000" disabled={busy} required /></label>
        <button type="submit" className="btn-primary flex w-full items-center justify-center gap-2" disabled={busy || code.length !== 6}>{busy && <LoaderCircle size={17} className="animate-spin" />}{copy.enable}</button>
      </form> : removing ? <div className="space-y-4"><h3 className="font-medium">{copy.removeConfirm}</h3><p className="text-sm text-muted-foreground">{copy.removeDetail}</p><div className="flex flex-wrap gap-2"><button type="button" className="btn-secondary" disabled={busy} onClick={() => setRemoving(null)}>{copy.keep}</button><button type="button" className="btn-primary" disabled={busy} onClick={() => void removeFactor()}>{copy.remove}</button></div></div> : <div className="space-y-4">
        <p className="text-sm font-medium">{factors.length ? copy.configured : busy ? copy.loading : copy.noConfigured}</p>
        {factors.map(factor => <div key={factor.id} className="flex items-center gap-3 rounded-xl border border-border p-3"><Smartphone size={20} className="shrink-0 text-violet-500" /><span className="flex-1 truncate text-sm">{factor.name}</span><button type="button" className="text-xs font-medium text-red-500 hover:underline" disabled={busy} onClick={() => { setRemoving(factor.id); setNotice(''); }}>{copy.remove}</button></div>)}
        <button type="button" className="btn-primary inline-flex items-center gap-2" disabled={busy} onClick={() => void enroll()}>{busy ? <LoaderCircle size={17} className="animate-spin" /> : <Plus size={17} />}{factors.length ? copy.add : copy.setup}</button>
        {factors.length > 0 && <p className="text-xs leading-relaxed text-muted-foreground">{copy.manageHint}</p>}
      </div>}
      {error && <p className="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>}
      {notice && <p className="mt-4 flex items-start gap-2 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-600 dark:text-emerald-400" role="status"><Check size={17} className="shrink-0" />{notice}</p>}
      <button type="button" className="btn-secondary mt-5 w-full" disabled={busy} onClick={() => void close()}>{pending ? copy.cancel : copy.close}</button>
    </dialog>
  </>;
}

