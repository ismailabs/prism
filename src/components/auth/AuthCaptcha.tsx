import { useEffect, useRef, useState } from 'react';
import { useAuthCopy } from './copy';
import { useAppStore } from '@/store/useAppStore';

// Only the public site key belongs in the browser. Supabase Auth must enforce
// CAPTCHA with the matching secret; this widget is not an authorization gate.
export const captchaSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim() ?? '';
interface Turnstile {
  render(element: HTMLElement, options: Record<string, unknown>): string;
  remove(id: string): void;
}
declare global { interface Window { turnstile?: Turnstile } }
let scriptPromise: Promise<Turnstile> | undefined;
function loadTurnstile(): Promise<Turnstile> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<Turnstile>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    const fail = () => { clearTimeout(timer); script.remove(); reject(new Error('CAPTCHA unavailable')); };
    const timer = window.setTimeout(fail, 15000);
    script.onerror = fail;
    script.onload = () => { clearTimeout(timer); if (window.turnstile) resolve(window.turnstile); else fail(); };
    document.head.append(script);
  }).catch(error => { scriptPromise = undefined; throw error; });
  return scriptPromise;
}

export function AuthCaptcha({ onToken }: { onToken: (token: string) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const copy = useAuthCopy();
  const locale = useAppStore(s => s.locale);
  useEffect(() => {
    if (!captchaSiteKey) return;
    let disposed = false;
    let widget: string | undefined;
    let api: Turnstile | undefined;
    const invalidate = () => { if (!disposed) { onToken(''); setFailed(true); } };
    void loadTurnstile().then(loaded => {
      if (disposed || !container.current) return;
      api = loaded;
      widget = api.render(container.current, {
        // Flexible widgets still require 300px. Compact fits the auth form at
        // 320px reflow and when a virtual keyboard reduces the visible area.
        sitekey: captchaSiteKey, theme: 'auto', size: 'compact', language: locale,
        'response-field': false,
        callback: (token: string) => { if (!disposed) { setFailed(false); onToken(token); } },
        'expired-callback': invalidate, 'error-callback': invalidate, 'timeout-callback': invalidate, 'unsupported-callback': invalidate,
      });
    }).catch(invalidate);
    return () => { disposed = true; if (widget !== undefined) api?.remove(widget); onToken(''); };
  }, [attempt, locale, onToken]);
  if (!captchaSiteKey) return null;
  return <div className="space-y-2" role="group" aria-label={copy.captchaLabel}>
    <div ref={container} />
    <p className="text-xs text-muted-foreground" role="status">{failed ? copy.captchaFailed : copy.captchaHelp}</p>
    {failed && <button className="text-link" type="button" onClick={() => { setFailed(false); setAttempt(value => value + 1); }}>{copy.captchaRetry}</button>}
  </div>;
}
