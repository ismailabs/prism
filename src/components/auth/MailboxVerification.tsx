import { useState, type FormEvent } from 'react';
import { LoaderCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { authCallback } from '@/lib/routes';
import { errorMessage } from '@/lib/utils';
import { AuthCaptcha, captchaSiteKey } from './AuthCaptcha';
import { useAuthCopy } from './copy';

export function MailboxVerification() {
  const { user } = useAuth();
  const copy = useAuthCopy();
  const [token, setToken] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user?.email || (captchaSiteKey && !token)) return;
    setBusy(true); setError('');
    try {
      const result = await supabase.auth.signInWithOtp({ email: user.email, options: { shouldCreateUser: false, emailRedirectTo: authCallback(), captchaToken: token || undefined } });
      if (result.error) throw result.error;
      setSent(true);
    } catch (cause) { setError(errorMessage(cause)); }
    finally { setBusy(false); setToken(''); setAttempt(value => value + 1); }
  }
  return <form className="space-y-4" onSubmit={event => void send(event)}>
    <h2 className="text-xl font-semibold">{copy.mailboxTitle}</h2>
    <p className="text-sm leading-relaxed text-muted-foreground">{copy.mailboxDetail}</p>
    <p className="break-all text-sm font-medium">{user?.email}</p>
    <AuthCaptcha key={attempt} onToken={setToken} />
    <button className="btn-primary inline-flex items-center justify-center gap-2" type="submit" disabled={busy || !user?.email || Boolean(captchaSiteKey && !token)}>{busy && <LoaderCircle size={17} className="animate-spin" />}{copy.mailboxSend}</button>
    {sent && <p role="status" className="rounded-lg bg-emerald-500/10 p-3 text-sm">{copy.mailboxSent}</p>}
    {error && <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
  </form>;
}
