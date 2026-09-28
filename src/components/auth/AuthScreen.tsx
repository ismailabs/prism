import { useState, type FormEvent } from 'react';
import { ArrowRight, Eye, EyeOff, LoaderCircle, LockKeyhole } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '../../lib/supabase';
import { useAuthCopy } from './copy';

export function AuthScreen() {
  const copy = useAuthCopy();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setNotice('');
    const passwordRule = mode === 'signup'
      ? z.string().min(8, copy.invalidPassword).regex(/[A-Za-z]/, copy.invalidPassword).regex(/[0-9]/, copy.invalidPassword)
      : z.string().min(1, copy.requiredPassword);
    const schema = z.object({
      email: z.string().trim().email(copy.invalidEmail), password: passwordRule,
      username: mode === 'signup' ? z.string().trim().min(1, copy.invalidName).max(60, copy.invalidName) : z.string(),
    });
    const result = schema.safeParse({ email, password, username });
    if (!result.success) { setError(result.error.issues[0]?.message ?? copy.failed); return; }
    setBusy(true);
    try {
      if (mode === 'signup') {
        const { data, error: authError } = await supabase.auth.signUp({ email: result.data.email, password: result.data.password, options: { data: { username: result.data.username }, emailRedirectTo: window.location.origin } });
        if (authError) throw authError;
        if (!data.session) { setNotice(copy.checkEmail); setMode('signin'); setPassword(''); }
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: result.data.email, password: result.data.password });
        if (authError) throw authError;
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : copy.failed); }
    finally { setBusy(false); }
  }

  async function googleSignIn() {
    setBusy(true); setError(''); setNotice('');
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
      if (authError) throw authError;
    } catch (cause) { setError(cause instanceof Error ? cause.message : copy.failed); setBusy(false); }
  }

  return <section className="mx-auto w-full max-w-md space-y-6" aria-labelledby="auth-title">
    <div className="space-y-2"><h2 id="auth-title" className="text-2xl font-semibold tracking-tight">{mode === 'signin' ? copy.welcome : copy.createIntro}</h2><p className="text-sm text-muted-foreground">{mode === 'signin' ? copy.subtitle : copy.createSubtitle}</p></div>
    <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1" aria-label="Authentication mode">
      {(['signin', 'signup'] as const).map(value => <button key={value} type="button" disabled={busy} aria-pressed={mode === value} className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${mode === value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`} onClick={() => { setMode(value); setError(''); setNotice(''); }}>{value === 'signin' ? copy.signIn : copy.signUp}</button>)}
    </div>
    <button type="button" className="btn-secondary flex w-full items-center justify-center gap-3" disabled={busy} onClick={() => void googleSignIn()}><img src="/google.png" width="18" height="18" className="h-[18px] w-[18px] object-contain" alt="" aria-hidden="true" />{copy.google}</button>
    <div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />{copy.or}<span className="h-px flex-1 bg-border" /></div>
    <form onSubmit={event => void submit(event)} className="space-y-4" noValidate>
      {mode === 'signup' && <label className="form-field flex flex-col gap-2 text-sm" htmlFor="auth-name">{copy.username}<input id="auth-name" className="input" autoComplete="nickname" value={username} disabled={busy} maxLength={60} onChange={event => setUsername(event.target.value)} placeholder={copy.nameHint} required /></label>}
      <label className="form-field flex flex-col gap-2 text-sm" htmlFor="auth-email">{copy.email}<input id="auth-email" className="input" type="email" autoComplete="email" value={email} disabled={busy} onChange={event => setEmail(event.target.value)} placeholder={copy.emailHint} required /></label>
      <label className="form-field flex flex-col gap-2 text-sm" htmlFor="auth-password">{copy.password}<span className="relative block"><input id="auth-password" className="input w-full pr-12" type={showPassword ? 'text' : 'password'} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} disabled={busy} onChange={event => setPassword(event.target.value)} placeholder={mode === 'signup' ? copy.passwordHint : '••••••••'} required /><button type="button" className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>
      {error && <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>}
      {notice && <p className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-600 dark:text-emerald-400" role="status">{notice}</p>}
      <button type="submit" className="btn-primary flex w-full items-center justify-center gap-2" disabled={busy}>{busy ? <><LoaderCircle size={17} className="animate-spin" />{copy.waiting}</> : <>{mode === 'signin' ? copy.signIn : copy.signUp}<ArrowRight size={17} /></>}</button>
    </form>
    <p className="flex items-start justify-center gap-2 text-center text-xs leading-relaxed text-muted-foreground"><LockKeyhole size={14} className="mt-0.5 shrink-0" />{copy.privacy}</p>
  </section>;
}
