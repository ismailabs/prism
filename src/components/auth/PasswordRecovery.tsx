import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { errorMessage } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import { loginPath, navigatePath, safeDestination } from '@/lib/routes';
import { useState, type FormEvent } from "react";
import { Button } from "../ui/button";
import { AuthCaptcha, captchaSiteKey } from './AuthCaptcha';
import { useAuthCopy } from './copy';
export function PasswordRecovery({
  reset,
  onBack,
}: {
  reset: boolean;
  onBack: () => void;
}) {
  const ms = useAppStore((s) => s.locale) === "ms";
  const { completeRecovery, signOut } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaAttempt, setCaptchaAttempt] = useState(0);
  const copy = useAuthCopy();
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!reset && captchaSiteKey && !captchaToken) { setError(copy.captchaHelp); return; }
    setBusy(true);
    setError("");
    try {
      if (reset) {
        if (
          password !== confirm ||
          password.length < 8 ||
          !/[A-Za-z]/.test(password) ||
          !/[0-9]/.test(password)
        )
          throw new Error(
            ms
              ? "Gunakan sekurang-kurangnya 8 aksara termasuk huruf dan nombor; kedua-dua kata laluan mesti sepadan."
              : "Use at least 8 characters including a letter and number; both passwords must match.",
          );
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        const destination = safeDestination(new URLSearchParams(window.location.search).get('next'));
        await signOut();
        completeRecovery();
        navigatePath(`${loginPath(destination)}&notice=password-updated`, true);
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(
          email.trim(),
          { redirectTo: `${window.location.origin}/?recovery=1`, captchaToken: captchaToken || undefined },
        );
        if (error) throw error;
      }
      setSent(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
      setCaptchaToken(''); setCaptchaAttempt(value => value + 1);
    }
  }
  return (
    <section className="space-y-5">
      <h1 className="text-2xl font-semibold">
        {reset
          ? ms
            ? "Tetapkan kata laluan baharu"
            : "Set a new password"
          : ms
            ? "Lupa kata laluan"
            : "Forgot password"}
      </h1>
      {sent ? (
        <p role="status">
          {reset
            ? ms
              ? "Kata laluan dikemas kini. Log masuk dengan kata laluan baharu."
              : "Password updated. Sign in with your new password."
            : ms
              ? "Jika akaun wujud, e-mel pemulihan telah dihantar. Semak peti masuk anda."
              : "If an account exists, a recovery email has been sent. Check your inbox."}
        </p>
      ) : (
        <form className="space-y-4" onSubmit={(e) => void submit(e)}>
          {reset ? (
            <>
              <label className="form-field">
                {ms ? "Kata laluan baharu" : "New password"}
                <input
                  className="input"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              <label className="form-field">
                {ms ? "Sahkan kata laluan" : "Confirm password"}
                <input
                  className="input"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </label>
            </>
          ) : (
            <label className="form-field">
              {ms ? "Alamat e-mel" : "Email address"}
              <input
                className="input"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
          )}
          {error && (
            <p role="alert" className="error-message">
              {error}
            </p>
          )}
          {!reset && <AuthCaptcha key={captchaAttempt} onToken={setCaptchaToken} />}
          <Button disabled={busy}>
            {reset
              ? ms
                ? "Kemas kini kata laluan"
                : "Update password"
              : ms
                ? "Hantar e-mel pemulihan"
                : "Send recovery email"}
          </Button>
        </form>
      )}
      <Button variant="outline" onClick={onBack} disabled={busy}>
        {ms ? "Kembali ke log masuk" : "Back to sign in"}
      </Button>
    </section>
  );
}
