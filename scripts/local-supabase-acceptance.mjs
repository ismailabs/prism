// Actual local GoTrue, SMTP sink and PostgREST acceptance. No hosted-provider claim.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHmac, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { createClient } from '@supabase/supabase-js';

const { api, key, mail,dbContainer,authVersion } = JSON.parse(await readFile('.cache/public-launch-supabase-ci/client.json', 'utf8'));
assert.equal(authVersion, 'v2.197.0', 'Native acceptance requires the verified actual Auth runtime version');
assert.equal(new URL(api).origin, 'http://127.0.0.1:54321', 'Only the declared local API may be tested');
assert.equal(new URL(mail).origin, 'http://127.0.0.1:54324', 'Only the declared local SMTP sink may be read');
assert.ok(typeof key === 'string' && key.length > 20, 'An intended local anon/publishable key is required');
assert.ok(!process.env.PRISM_E2E_BASE_URL && !process.env.PRISM_E2E_STORAGE_STATE, 'Hosted test options are forbidden');
const receipt = {
  startedAtUTC: new Date().toISOString(),
  environment: 'real local Supabase GoTrue/PostgREST/PostgreSQL 17 and Mailpit on disposable Linux CI runner',
  checkoutSHA: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  candidateSHA: process.env.PRISM_LOCAL_CANDIDATE_SHA ?? null,
  nativeAuthVersion: authVersion,
  hostedVerified: false, productionContacted: false, syntheticOnly: true,
  serviceRoleUsed: false, realInboxDeliveryVerified: false,
  databaseAdminForSyntheticFinancialFixtureOnly: true,independentPhysicalAuthenticatorsObserved:false,
  tokensOrPasswordsPublished: false, checks: [], limitations: [
    'Local SMTP capture is not real recipient inbox acceptance.',
    'No hosted OAuth, CAPTCHA, physical-device, AT, operator or recovery attestation.',
    'Stronger local password policy is not a production setting or leaked-password disposition.',
  ],
};
const clients = [];
const client = (token, pkce = false) => {
  const value = createClient(api, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, flowType: pkce ? 'pkce' : 'implicit', experimental:{recoveryCodes:true} }, ...(token ? { global: { headers: { Authorization: `Bearer ${token}` } } } : {}) });
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
const usedCounters=new Map();
async function verifyFactor(auth,factor) {
  // Wait only for a fresh cryptographic counter if this TOTP was consumed.
  while(usedCounters.get(factor.id)===Math.floor(Date.now()/30_000)) await delay(100);
  const result=requireOk(await auth.auth.mfa.challengeAndVerify({factorId:factor.id,code:otp(factor.totp.secret)}),'native TOTP verification');
  usedCounters.set(factor.id,Math.floor(Date.now()/30_000));
  return result;
}
async function mailboxSession(identity) {
  const next=client(undefined,true);
  let sent;
  for(let attempt=0;attempt<3;attempt++){
    sent=await next.auth.signInWithOtp({email:identity.email,options:{shouldCreateUser:false,emailRedirectTo:'http://127.0.0.1:5173'}});
    if(sent.error?.code!=='over_email_send_rate_limit'||attempt===2)break;
    // Actual provider throttle, not a guessed UI wait: the isolated CLI config
    // explicitly retains a one-second per-user mail interval. Never disable it.
    await delay(1_000);
  }
  requireOk(sent,'independent native mailbox proof request');
  const action=await emailAction(identity,'magiclink');
  const link=new URL(`${api}/auth/v1/verify`);
  link.searchParams.set('token',action.token_hash);link.searchParams.set('type',action.type);link.searchParams.set('redirect_to',action.redirect);
  const response=await fetch(link,{redirect:'manual',signal:AbortSignal.timeout(5_000)});
  assert.equal(response.status,303,'Mailbox proof uses the native PKCE redirect');
  const redirect=new URL(response.headers.get('location'));assert.equal(redirect.origin,'http://127.0.0.1:5173');
  const data=requireOk(await next.auth.exchangeCodeForSession(redirect.searchParams.get('code')),'mailbox PKCE exchange');
  assert.equal(data.user.id,identity.id,'Mailbox proof must preserve the original user ID');
  assert.ok(JSON.parse(Buffer.from(data.session.access_token.split('.')[1],'base64url')).amr.some(entry=>entry.method==='magiclink'));
  identity.auth=next;identity.token=data.session.access_token;
}
async function enrollPair(identity,alreadyProved=false,legacyFactorTransition=false) {
  if(!alreadyProved)await mailboxSession(identity);
  identity.factors=[];
  for(let index=0;index<2;index++){
    const factor=requireOk(await identity.auth.auth.mfa.enroll({factorType:'totp',friendlyName:`Synthetic separate authenticator ${index+1}` }),'native independent factor enrollment');
    await verifyFactor(identity.auth,factor);
    if(index===0&&legacyFactorTransition){
      // A native verified factor exists before PRISM approval, as it would for
      // an optional-MFA user upgrading to the new approval policy.
      identity.auth=client();
      const signedIn=requireOk(await identity.auth.auth.signInWithPassword({email:identity.email,password:identity.password}),'existing MFA user password sign-in');
      assert.equal(signedIn.user.id,identity.id);
      assert.equal(requireOk(await identity.auth.rpc('financial_access_status'),'existing unapproved MFA transition').allowed,false);
      assert.ok(requireOk(await identity.auth.auth.mfa.listFactors(),'preserved legacy native factor').totp.some(f=>f.id===factor.id));
      await mailboxSession(identity);
      await verifyFactor(identity.auth,factor);
      check('existing verified native MFA factor survives fresh password/mail sessions and is approved under its original factor and user IDs');
    }
    requireOk(await identity.auth.rpc('approve_mfa_factor',{p_factor_id:factor.id,p_separate_backup:true}),'server independently verified factor approval');
    identity.factors.push(factor);
    const state=requireOk(await identity.auth.rpc('financial_access_status'),'server access status');
    assert.equal(state.allowed,index===1,'One factor must not grant financial access');
  }
  assert.notEqual(identity.factors[0].totp.secret,identity.factors[1].totp.secret,'Native factors must have distinct secrets');
  identity.token=requireOk(await identity.auth.auth.getSession(),'approved session').session.access_token;
}
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

  activeStep='legacy stolen-password enrollment attack and transactional rollback';
  assert.equal(dbContainer,'supabase_db_prism-public-launch-synthetic');
  assert.match(a.id,/^[a-f0-9-]{36}$/i);
  execFileSync('docker',['exec','-i',dbContainer,'psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],{
    input:`insert into public.financial_notes(user_id,title,body) values('${a.id}'::uuid,'Synthetic legacy MFA record','Existing private record');`,encoding:'utf8',stdio:['pipe','pipe','pipe'],timeout:10_000});
  assert.equal(requireOk(await a.auth.from('financial_notes').select('id'),'legacy AAL1 denied').length,0);
  const attackFactor=requireOk(await a.auth.auth.mfa.enroll({factorType:'totp',friendlyName:'Synthetic password-only attack'}),'bounded attack enrollment');
  const attack=await a.auth.auth.mfa.challengeAndVerify({factorId:attackFactor.id,code:otp(attackFactor.totp.secret)});
  assert.ok(attack.error,'A password-only attacker must not activate a factor');
  const afterAttack=requireOk(await a.auth.auth.mfa.listFactors(),'factor rollback inspection');
  assert.ok(!afterAttack.all.some(f=>f.status==='verified'),'Rejected token issuance must roll back verified factor state');
  assert.equal(requireOk(await a.auth.from('financial_notes').select('id'),'attack read denied').length,0);
  requireOk(await a.auth.auth.mfa.unenroll({factorId:attackFactor.id}),'unverified attack-factor cleanup');
  check('stolen password cannot activate attacker TOTP or read an existing financial record; native MFA transaction rolls back');

  activeStep='independent mailbox proof, two-factor approval and original ownership';
  await enrollPair(a,false,true);
  await enrollPair(b);
  assert.equal(requireOk(await a.auth.from('financial_notes').select('title'),'preserved legacy record').length,1);
  assert.equal(requireOk(await b.auth.from('financial_notes').select('title'),'foreign legacy denial').length,0);
  check('native mailbox proof plus two distinct approved authenticators preserves identities and financial ownership');
  const recoveryCapability=await a.auth.auth.mfa.recoveryCodes.getStatus();
  receipt.nativeRecoveryCodes={readOnlyProbe:true,noCodesGenerated:true,errorCode:recoveryCapability.error?.code??null,httpStatus:recoveryCapability.error?.status??200,productionOrFreeHostedEntitlementProven:false};

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
  const firstFactorOnly=client();
  const firstFactorSignin=requireOk(await firstFactorOnly.auth.signInWithPassword({email:a.email,password:a.password}),'new AAL1 password-only session');
  const staleAal1 = client(firstFactorSignin.session.access_token);
  requireOk(await a.auth.rpc('begin_mfa_management'),'fresh approved-factor replacement authorization');
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
  usedCounters.set(factor.id,Math.floor(Date.now()/30_000));
  assert.ok(verified.access_token, 'TOTP verification must issue an AAL2 session');
  requireOk(await a.auth.rpc('approve_mfa_factor',{p_factor_id:factor.id,p_separate_backup:true}),'approve verified replacement factor');
  const staleRead = requireOk(await staleAal1.from('categories').select('id'), 'insufficient AAL read');
  assert.equal(staleRead.length, 0, 'AAL1 must fail closed after a factor is verified');
  const staleWrite = await staleAal1.from('categories').insert({ user_id: a.id, name: 'Forbidden AAL1 category', type: 'income' });
  assert.equal(staleWrite.error?.code, '42501', 'Insufficient AAL must deny writes');
  const aal2 = client(verified.access_token);
  assert.equal(requireOk(await aal2.from('categories').select('id'), 'AAL2 own read').length, 1, 'Actual AAL2 must retain permitted own access');
  requireOk(await a.auth.auth.mfa.unenroll({ factorId: factor.id }), 'TOTP un-enrollment from verified session');
  assert.equal(requireOk(await aal2.from('categories').select('id'),'removed-factor stale AAL2 denial').length,0);
  requireOk(await a.auth.auth.refreshSession(),'downgraded session refresh');
  await verifyFactor(a.auth,a.factors[0]);
  check('actual TOTP enrollment/challenge/verification/un-enrollment; foreign-factor and wrong-code denial; verified factor blocks stale AAL1 read and write; AAL2 own access succeeds');

  activeStep = 'Recovery, weak reset denial and prior-session termination';
  const previousB = client(b.token);
  const recovering = client(undefined,true);
  requireOk(await recovering.auth.resetPasswordForEmail(b.email, { redirectTo: 'http://127.0.0.1:5173/?recovery=1' }), 'synthetic recovery request');
  const recoveryAction = await emailAction(b, 'recovery');
  const recoveryLink=new URL(`${api}/auth/v1/verify`);
  recoveryLink.searchParams.set('token',recoveryAction.token_hash);recoveryLink.searchParams.set('type','recovery');recoveryLink.searchParams.set('redirect_to',recoveryAction.redirect);
  const recoveryResponse=await fetch(recoveryLink,{redirect:'manual',signal:AbortSignal.timeout(5_000)});
  assert.equal(recoveryResponse.status,303);
  const recoveryRedirect=new URL(recoveryResponse.headers.get('location'));assert.equal(recoveryRedirect.origin,'http://127.0.0.1:5173');
  requireOk(await recovering.auth.exchangeCodeForSession(recoveryRedirect.searchParams.get('code')),'received native PKCE recovery action');
  assert.equal((await recovering.auth.updateUser({ password: 'short' })).error?.code, 'weak_password', 'Server must reject weak reset passwords');
  assert.ok((await recovering.auth.updateUser({password:password()})).error,'Recovery email alone cannot change an MFA-protected password');
  await verifyFactor(recovering,b.factors[0]);
  const changedPassword = password();
  requireOk(await recovering.auth.updateUser({ password: changedPassword }), 'strong recovery password change');
  requireOk(await recovering.auth.signOut(), 'application recovery global sign-out');
  assert.equal(requireOk(await previousB.from('accounts').select('id'), 'revoked prior recovery session read').length, 0, 'Prior session must fail closed after recovery sign-out');
  assert.equal((await client().auth.signInWithPassword({ email: b.email, password: b.password })).error?.code, 'invalid_credentials', 'Old password must stop working');
  requireOk(await b.auth.auth.signInWithPassword({ email: b.email, password: changedPassword }), 'new password sign-in');
  assert.equal(requireOk(await b.auth.from('accounts').select('id'),'reset login still needs MFA').length,0);
  // Model losing the original authenticator installations while a separately
  // retained setup-key copy survives. This is cryptographic restore evidence,
  // not an observation of a person's physical backup custody.
  const restoredBackup=structuredClone(b.factors[1]);
  for(const original of b.factors)original.totp.secret='';
  await verifyFactor(b.auth,restoredBackup);
  assert.equal(requireOk(await b.auth.auth.getUser(),'restored backup original identity').user.id,b.id);
  assert.equal(requireOk(await b.auth.from('accounts').select('id'),'restored backup original financial ownership').length,1);
  check('restored offline copy of an existing approved factor recovers native financial access after original authenticator secrets are discarded; no factor reset or admin override');
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
  activeStep='backup replacement and total-factor-loss recovery boundary';
  await enrollPair(c,true);
  requireOk(await c.auth.from('financial_notes').insert({user_id:c.id,title:'Synthetic recovery fixture',body:'Private even after factor loss'}),'C financial fixture');
  for(const enrolled of c.factors)requireOk(await c.auth.auth.mfa.unenroll({factorId:enrolled.id}),'explicit synthetic factor loss');
  requireOk(await c.auth.auth.refreshSession(),'refresh after total factor loss');
  await mailboxSession(c);
  const lostReplacement=requireOk(await c.auth.auth.mfa.enroll({factorType:'totp',friendlyName:'Synthetic forbidden total-loss replacement'}),'bounded post-loss factor enrollment');
  const lostResult=await c.auth.auth.mfa.challengeAndVerify({factorId:lostReplacement.id,code:otp(lostReplacement.totp.secret)});
  assert.ok(lostResult.error,'Email alone must never restart an activated account after total factor loss');
  assert.equal(requireOk(await c.auth.from('financial_notes').select('id'),'total-loss private access denied').length,0);
  assert.equal(requireOk(await c.auth.auth.mfa.listFactors(),'total-loss rollback factors').totp.length,0);
  check('approved backup supports native recovery; loss of every factor remains locked despite fresh email proof, with rejected activation rolled back');
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
