// Actual local GoTrue, SMTP sink and PostgREST acceptance. No hosted-provider claim.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHmac, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { createClient } from '@supabase/supabase-js';

const { api, key, mail } = JSON.parse(await readFile('.cache/public-launch-supabase-ci/client.json', 'utf8'));
assert.equal(new URL(api).origin, 'http://127.0.0.1:54321', 'Only the declared local API may be tested');
assert.equal(new URL(mail).origin, 'http://127.0.0.1:54324', 'Only the declared local SMTP sink may be read');
assert.ok(typeof key === 'string' && key.length > 20, 'An intended local anon/publishable key is required');
assert.ok(!process.env.PRISM_E2E_BASE_URL && !process.env.PRISM_E2E_STORAGE_STATE, 'Hosted test options are forbidden');
const receipt = {
  startedAtUTC: new Date().toISOString(),
  environment: 'real local Supabase GoTrue/PostgREST/PostgreSQL 17 and Mailpit on disposable Linux CI runner',
  checkoutSHA: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  candidateSHA: process.env.PRISM_LOCAL_CANDIDATE_SHA ?? null,
  hostedVerified: false, productionContacted: false, syntheticOnly: true,
  serviceRoleUsed: false, realInboxDeliveryVerified: false,
  tokensOrPasswordsPublished: false, checks: [], limitations: [
    'Local SMTP capture is not real recipient inbox acceptance.',
    'No hosted OAuth, CAPTCHA, physical-device, AT, operator or recovery attestation.',
    'Stronger local password policy is not a production setting or leaked-password disposition.',
  ],
};
const clients = [];
const client = (token, pkce = false) => {
  const value = createClient(api, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, flowType: pkce ? 'pkce' : 'implicit' }, ...(token ? { global: { headers: { Authorization: `Bearer ${token}` } } } : {}) });
  clients.push(value); return value;
};
const requireOk = (result, label) => {
  if (result.error) {
    const code = String(result.error.code ?? 'unknown').replace(/[^a-zA-Z0-9_]/g, '').slice(0, 80);
    throw new Error(`${label}: provider code ${code}`);
  }
  return result.data;
};
const check = (label, details = {}) => { receipt.checks.push({ label, status: 'PASS', ...details }); console.log(`PASS local Supabase: ${label}`); };
const password = () => `Local1!${randomUUID()}`;
const identities = Object.fromEntries(['a', 'b', 'c', 'expired'].map(label => [label, { email: `prism-${label}-${randomUUID()}@example.test`, password: password(), auth: client() }]));
const messagesSeen = new Set();
async function emailAction(identity, type) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const response = await fetch(`${mail}/api/v1/messages`, { signal: AbortSignal.timeout(5_000) });
    assert.equal(response.status, 200, 'Actual local SMTP sink must respond');
    const body = await response.json();
    for (const message of body.messages ?? []) {
      if (messagesSeen.has(message.ID) || !message.To?.some(recipient => recipient.Address === identity.email)) continue;
      const detailResponse = await fetch(`${mail}/api/v1/message/${encodeURIComponent(message.ID)}`, { signal: AbortSignal.timeout(5_000) });
      assert.equal(detailResponse.status, 200, 'Expected synthetic message must exist');
      const detail = await detailResponse.json();
      for (const match of String(detail.HTML ?? '').matchAll(/href=["']([^"']+)["']/g)) {
        const url = new URL(match[1].replaceAll('&amp;', '&'));
        if (url.pathname !== '/auth/v1/verify' || url.searchParams.get('type') !== type) continue;
        assert.equal(url.origin, new URL(api).origin, 'Confirmation/recovery action must stay on the local Auth server');
        assert.ok(url.searchParams.get('token'), 'Actual SMTP message must contain its action token');
        messagesSeen.add(message.ID);
        return { token_hash: url.searchParams.get('token'), type, redirect: url.searchParams.get('redirect_to') };
      }
    }
    await delay(200); // Poll the SMTP arrival predicate, bounded by the deadline.
  }
  throw new Error(`Local SMTP ${type} action was not received before deadline`);
}
const otp = (secret, seconds = Date.now() / 1000) => {
  let bits = '';
  for (const char of secret.toUpperCase().replaceAll('=', '')) {
    const value = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.indexOf(char);
    assert.ok(value >= 0, 'TOTP secret must be base32'); bits += value.toString(2).padStart(5, '0');
  }
  const bytes = Buffer.from(Array.from({ length: Math.floor(bits.length / 8) }, (_, index) => parseInt(bits.slice(index * 8, index * 8 + 8), 2)));
  const counter = Buffer.alloc(8); counter.writeBigUInt64BE(BigInt(Math.floor(seconds / 30)));
  const digest = createHmac('sha1', bytes).update(counter).digest();
  const offset = digest[digest.length - 1] & 15;
  return String((digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).padStart(6, '0');
};
// RFC 6238 test vector, truncated to the six-digit form GoTrue uses.
assert.equal(otp('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', 59), '287082');
let activeStep = 'Auth settings and password rejection';
try {
  const settingsResponse = await fetch(`${api}/auth/v1/settings`, { headers: { apikey: key }, signal: AbortSignal.timeout(5_000) });
  assert.equal(settingsResponse.status, 200, 'Actual local Auth settings must respond');
  const settings = await settingsResponse.json();
  assert.equal(settings.disable_signup, false, 'Synthetic registration must be enabled only locally');
  assert.equal(settings.mailer_autoconfirm, false, 'Email confirmation must be required locally');
  const weak = await client().auth.signUp({ email: `weak-${randomUUID()}@example.test`, password: 'short' });
  assert.equal(weak.error?.code, 'weak_password', 'The actual Auth server must reject weak registration passwords');
  check('server rejects weak passwords and requires email confirmation');

  activeStep = 'Public signup, confirmation and reused token denial';
  for (const label of ['a', 'b']) {
    const identity = identities[label];
    const signup = requireOk(await identity.auth.auth.signUp({ email: identity.email, password: identity.password, options: { data: { username: `Synthetic ${label.toUpperCase()}` } } }), 'public synthetic signup');
    assert.equal(signup.session, null, 'Unconfirmed registration must not issue a session');
    identity.id = signup.user?.id; assert.ok(identity.id, 'Public signup must create the synthetic identity');
    const unconfirmed = await identity.auth.auth.signInWithPassword({ email: identity.email, password: identity.password });
    assert.equal(unconfirmed.error?.code, 'email_not_confirmed', 'Unconfirmed sign-in must be denied');
    const action = await emailAction(identity, 'signup');
    const confirmed = requireOk(await identity.auth.auth.verifyOtp({ token_hash: action.token_hash, type: action.type }), 'delivered local confirmation');
    assert.equal(confirmed.user?.id, identity.id, 'Confirmation must belong to the requesting synthetic identity');
    const reused = await client().auth.verifyOtp({ token_hash: action.token_hash, type: action.type });
    assert.equal(reused.error?.code, 'otp_expired', 'A used confirmation token must fail');
    requireOk(await identity.auth.auth.signOut(), 'confirmation-session sign-out');
    const signedIn = requireOk(await identity.auth.auth.signInWithPassword({ email: identity.email, password: identity.password }), 'normal confirmed password sign-in');
    identity.token = signedIn.session?.access_token; assert.ok(identity.token, 'Confirmed sign-in must issue its own session');
    check(`synthetic ${label.toUpperCase()} public signup, local SMTP confirmation, reused-link denial and normal sign-in`);
  }
  const { a, b } = identities;
  const wrong = await client().auth.signInWithPassword({ email: a.email, password: password() });
  assert.equal(wrong.error?.code, 'invalid_credentials', 'Wrong-password sign-in must fail');
  check('wrong-password sign-in denied');

  activeStep = 'Real Auth session ownership and exact money';
  const anon = client();
  const anonRead = await anon.from('profiles').select('id');
  assert.equal(anonRead.error?.code, '42501', 'Anon must not have profile SELECT');
  for (const identity of [a, b]) {
    const profile = requireOk(await identity.auth.from('profiles').select('id,currency,language'), 'own profile read');
    assert.equal(profile.length, 1, 'A real current session must see only its own profile');
    assert.equal(profile[0].id, identity.id, 'Profile ownership must match the actual Auth session');
    assert.equal(profile[0].currency, 'MYR', 'Malaysia-first profile default must reach actual registered users');
    const category = requireOk(await identity.auth.from('categories').insert({ user_id: identity.id, name: 'Synthetic income', type: 'income', color: '#228866' }).select('id').single(), 'own category insert');
    identity.category = category.id;
    const account = requireOk(await identity.auth.from('accounts').insert({ user_id: identity.id, name: 'Synthetic account', currency: 'MYR', opening_balance: '100.01' }).select('id').single(), 'own account insert');
    identity.account = account.id;
  }
  const crossRead = requireOk(await a.auth.from('categories').select('id').eq('user_id', b.id), 'cross-owner filtered read');
  assert.equal(crossRead.length, 0, 'A must not see B categories');
  const crossWrite = await a.auth.from('categories').insert({ user_id: b.id, name: 'Forbidden foreign category', type: 'income' });
  assert.equal(crossWrite.error?.code, '42501', 'Cross-owner INSERT must fail through RLS');
  const crossUpdate = requireOk(await a.auth.from('categories').update({ name: 'Forbidden change' }).eq('id', b.category).select('id'), 'cross-owner update');
  assert.equal(crossUpdate.length, 0, 'Cross-owner UPDATE must touch no rows');
  const crossDelete = requireOk(await a.auth.from('categories').delete().eq('id', b.category).select('id'), 'cross-owner delete');
  assert.equal(crossDelete.length, 0, 'Cross-owner DELETE must touch no rows');
  const retained = requireOk(await b.auth.from('categories').select('name').eq('id', b.category).single(), 'owner checks retained category');
  assert.equal(retained.name, 'Synthetic income', 'Foreign mutation attempts must preserve B data');
  requireOk(await a.auth.from('transactions').insert({ user_id: a.id, account_id: a.account, category_id: a.category, amount: '0.01', currency: 'MYR', type: 'income', description: 'Synthetic exact money', transaction_date: '2000-02-01T00:00:00Z' }), 'exact synthetic transaction');
  const money = requireOk(await a.auth.from('exact_accounts').select('id,opening_balance,balance').eq('id', a.account).single(), 'exact invoker account read');
  assert.equal(money.opening_balance, '100.01'); assert.equal(money.balance, '100.02');
  const foreignView = requireOk(await b.auth.from('exact_accounts').select('id').eq('id', a.account), 'cross-owner invoker view');
  assert.equal(foreignView.length, 0, 'Invoker view must enforce real-session ownership');
  const invalidPrecision = await a.auth.from('transactions').insert({ user_id: a.id, amount: '0.001', currency: 'MYR', type: 'income', transaction_date: '2000-02-01T00:00:00Z' });
  assert.equal(invalidPrecision.error?.code, '23514', 'Extra precision must be rejected before any rounding');
  check('anon and real A/B owner read/insert/update/delete denial; invoker view isolation; exact decimal text and precision rejection');

  activeStep = 'Real TOTP enrollment and restrictive AAL policies';
  const staleAal1 = client(a.token);
  const factor = requireOk(await a.auth.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Synthetic local authenticator' }), 'TOTP enrollment');
  assert.ok(factor.totp?.secret && factor.id, 'Actual Auth must return the synthetic TOTP factor');
  const foreignChallenge = await b.auth.auth.mfa.challenge({ factorId: factor.id });
  assert.equal(foreignChallenge.error?.code, 'mfa_factor_not_found', 'A foreign identity cannot challenge A factor');
  const invalidChallenge = requireOk(await a.auth.auth.mfa.challenge({ factorId: factor.id }), 'invalid-code TOTP challenge');
  const correctCode = otp(factor.totp.secret);
  const wrongCode = String((Number(correctCode) + 1) % 1_000_000).padStart(6, '0');
  const invalidCode = await a.auth.auth.mfa.verify({ factorId: factor.id, challengeId: invalidChallenge.id, code: wrongCode });
  assert.equal(invalidCode.error?.code, 'mfa_verification_failed', 'Actual invalid TOTP must be rejected');
  const challenge = requireOk(await a.auth.auth.mfa.challenge({ factorId: factor.id }), 'TOTP challenge');
  const verified = requireOk(await a.auth.auth.mfa.verify({ factorId: factor.id, challengeId: challenge.id, code: otp(factor.totp.secret) }), 'actual TOTP verification');
  assert.ok(verified.access_token, 'TOTP verification must issue an AAL2 session');
  const staleRead = requireOk(await staleAal1.from('categories').select('id'), 'insufficient AAL read');
  assert.equal(staleRead.length, 0, 'AAL1 must fail closed after a factor is verified');
  const staleWrite = await staleAal1.from('categories').insert({ user_id: a.id, name: 'Forbidden AAL1 category', type: 'income' });
  assert.equal(staleWrite.error?.code, '42501', 'Insufficient AAL must deny writes');
  const aal2 = client(verified.access_token);
  assert.equal(requireOk(await aal2.from('categories').select('id'), 'AAL2 own read').length, 1, 'Actual AAL2 must retain permitted own access');
  requireOk(await a.auth.auth.mfa.unenroll({ factorId: factor.id }), 'TOTP un-enrollment from verified session');
  check('actual TOTP enrollment/challenge/verification/un-enrollment; foreign-factor and wrong-code denial; verified factor blocks stale AAL1 read and write; AAL2 own access succeeds');

  activeStep = 'Recovery, weak reset denial and prior-session termination';
  const previousB = client(b.token);
  requireOk(await b.auth.auth.resetPasswordForEmail(b.email, { redirectTo: 'http://127.0.0.1:5173/?recovery=1' }), 'synthetic recovery request');
  const recoveryAction = await emailAction(b, 'recovery');
  const recovering = client();
  requireOk(await recovering.auth.verifyOtp({ token_hash: recoveryAction.token_hash, type: recoveryAction.type }), 'received local recovery action');
  assert.equal((await recovering.auth.updateUser({ password: 'short' })).error?.code, 'weak_password', 'Server must reject weak reset passwords');
  const changedPassword = password();
  requireOk(await recovering.auth.updateUser({ password: changedPassword }), 'strong recovery password change');
  requireOk(await recovering.auth.signOut(), 'application recovery global sign-out');
  assert.equal(requireOk(await previousB.from('accounts').select('id'), 'revoked prior recovery session read').length, 0, 'Prior session must fail closed after recovery sign-out');
  assert.equal((await client().auth.signInWithPassword({ email: b.email, password: b.password })).error?.code, 'invalid_credentials', 'Old password must stop working');
  requireOk(await b.auth.auth.signInWithPassword({ email: b.email, password: changedPassword }), 'new password sign-in');
  assert.equal((await client().auth.verifyOtp({ token_hash: recoveryAction.token_hash, type: recoveryAction.type })).error?.code, 'otp_expired', 'Recovery action must be single use');
  check('actual local recovery delivery, weak reset denial, strong reset, global session termination, old password and reused recovery denial');

  activeStep = 'Unsupported redirect and expired confirmation';
  const c = identities.c;
  c.auth = client(undefined, true);
  const pkceSignup = requireOk(await c.auth.auth.signUp({ email: c.email, password: c.password, options: { emailRedirectTo: 'https://example.invalid/forbidden' } }), 'redirect-denial synthetic signup');
  c.id = pkceSignup.user?.id;
  const redirectAction = await emailAction(c, 'signup');
  assert.equal(new URL(redirectAction.redirect).origin, 'http://127.0.0.1:5173', 'Unsupported redirect must fall back to the local allowlisted site');
  const verifyLink = new URL(`${api}/auth/v1/verify`);
  verifyLink.searchParams.set('token', redirectAction.token_hash);
  verifyLink.searchParams.set('type', redirectAction.type);
  verifyLink.searchParams.set('redirect_to', redirectAction.redirect);
  const redirectResponse = await fetch(verifyLink, { redirect: 'manual', signal: AbortSignal.timeout(5_000) });
  assert.equal(redirectResponse.status, 303, 'Pinned GoTrue PKCE confirmation uses HTTP See Other');
  const callback = new URL(redirectResponse.headers.get('location'));
  assert.equal(callback.origin, 'http://127.0.0.1:5173', 'Actual callback must stay on the local allowlist');
  const code = callback.searchParams.get('code');
  assert.ok(code, 'Actual PKCE callback must contain its one-time code');
  const exchanged = requireOk(await c.auth.auth.exchangeCodeForSession(code), 'actual local PKCE code exchange');
  assert.ok(exchanged.session?.access_token, 'PKCE exchange must issue a real local session');
  assert.equal(exchanged.user?.id, c.id, 'PKCE session must match its requesting synthetic identity');
  check('actual PKCE confirmation/code exchange; unsupported redirect replaced by the allowlisted local site');
  const expired = identities.expired;
  const issuedAt = Date.now();
  requireOk(await expired.auth.auth.signUp({ email: expired.email, password: expired.password }), 'expiry synthetic signup');
  const expiringAction = await emailAction(expired, 'signup');
  // Wait for the actual configured 60-second local token expiry, not a guessed UI delay.
  await delay(Math.max(0, issuedAt + 62_000 - Date.now()));
  assert.equal((await client().auth.verifyOtp({ token_hash: expiringAction.token_hash, type: expiringAction.type })).error?.code, 'otp_expired', 'Actually expired confirmation must be rejected');
  check('actually expired local confirmation token rejected', { configuredTTLSeconds: 60, elapsedSeconds: (Date.now() - issuedAt) / 1000 });

  activeStep = 'Global sign-out revocation';
  const currentA = requireOk(await a.auth.auth.getSession(), 'current local session').session;
  assert.ok(currentA?.access_token, 'A has its current synthetic session');
  const revoked = client(currentA.access_token);
  assert.equal(requireOk(await revoked.from('transactions').select('id'), 'private read before sign-out').length, 1, 'The tested current session must work before its revocation');
  requireOk(await a.auth.auth.signOut(), 'global local sign-out');
  assert.equal(requireOk(await revoked.from('transactions').select('id'), 'revoked real session read').length, 0, 'A revoked Auth session cannot retain finance read access');
  assert.equal((await revoked.from('categories').insert({ user_id: a.id, name: 'Forbidden revoked category', type: 'income' })).error?.code, '42501', 'Revoked Auth session cannot write');
  const refresh = await client().auth.refreshSession({ refresh_token: currentA.refresh_token });
  assert.ok(['refresh_token_not_found', 'session_not_found', 'refresh_token_already_used'].includes(refresh.error?.code), 'A globally revoked session cannot refresh');
  check('real global sign-out revokes private read/write and refresh despite an otherwise unexpired JWT');
  receipt.status = 'PASS';
} catch (error) {
  receipt.status = 'FAIL';
  // Error messages are our fixed assertions/codes; no provider payload, tokens or password values.
  receipt.failure = { step: activeStep, message: String(error.message).replace(/[A-Za-z0-9_-]{24,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[redacted token]').slice(0, 600) };
  console.error(`FAIL local Supabase at ${activeStep}: ${receipt.failure.message}`);
  process.exitCode = 1;
} finally {
  for (const value of clients) value.auth.stopAutoRefresh();
  receipt.finishedAtUTC = new Date().toISOString();
  await mkdir('artifacts/public-launch', { recursive: true });
  await writeFile('artifacts/public-launch/local-supabase-acceptance.json', JSON.stringify(receipt, null, 2) + '\n');
  console.log(JSON.stringify(receipt));
}
